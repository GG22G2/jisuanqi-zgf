mod calculator;
mod global_addition;
mod gpu_calculator;
mod models;
mod search;
mod skill_effect;
mod solver;

use axum::{
    extract::State,
    http::{Method, StatusCode},
    response::Json,
    routing::{get, post},
    Router,
};
use gpu_calculator::{ComputeResult, FullComputeInput, GpuContext, Stage1Input};
use models::*;
use serde::Serialize;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

struct AppState {
    gpu: GpuContext,
    official_data: OfficialGameDataRaw,
}

#[derive(Serialize)]
struct StatusResponse {
    status: String,
    gpu: String,
}

async fn get_status(State(state): State<Arc<AppState>>) -> Json<StatusResponse> {
    Json(StatusResponse {
        status: "ok".to_string(),
        gpu: state.gpu.gpu_name.clone(),
    })
}

async fn full_calculate(
    State(state): State<Arc<AppState>>,
    Json(req): Json<FullCalculateRequest>,
) -> Result<Json<Vec<FinalTopResult>>, (StatusCode, String)> {
    println!("==> [API /full_calculate] Received full calculate request");

    let my_game_data: MyGameDataRaw = serde_json::from_value(req.my_game_data)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid myGameData: {}", e)))?;

    let rule_data: RuleDataRaw = serde_json::from_value(req.rule)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid rule: {}", e)))?;

    let config = req.cal_config.unwrap_or_default();

    println!(
        "==> [API /full_calculate] Chefs: {}, Recipes: {}, recipeLimit: {}",
        my_game_data.chefs.len(),
        my_game_data.recipes.len(),
        config.recipe_limit
    );

    match solver::solve_full(
        &state.official_data,
        &my_game_data,
        &rule_data,
        &config,
        &state.gpu,
    )
    .await
    {
        Ok(res) => {
            println!(
                "==> [API /full_calculate] Successfully calculated! Score: {}",
                res.score
            );
            Ok(Json(vec![res]))
        }
        Err(e) => {
            eprintln!("==> [API /full_calculate] Error: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e))
        }
    }
}

async fn compute_full(
    State(state): State<Arc<AppState>>,
    Json(input): Json<FullComputeInput>,
) -> Result<Json<ComputeResult>, (StatusCode, String)> {
    match state.gpu.run_full_compute(input).await {
        Ok(res) => Ok(Json(res)),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e)),
    }
}

async fn compute_stage1(
    State(state): State<Arc<AppState>>,
    Json(input): Json<Stage1Input>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    match state.gpu.run_stage1(&input).await {
        Ok((scores, indices)) => Ok(Json(serde_json::json!({
            "group_max_score": scores,
            "group_max_score_chef_index": indices,
        }))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e)),
    }
}

fn load_official_game_data() -> Result<OfficialGameDataRaw, String> {
    let candidate_paths = ["./gameData.json", "../gameData.json"];
    for p in candidate_paths {
        if std::path::Path::new(p).exists() {
            println!("==> 加载官方数据: {}", p);
            let content = std::fs::read_to_string(p)
                .map_err(|e| format!("Failed to read {}: {}", p, e))?;
            let data: OfficialGameDataRaw = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse {}: {}", p, e))?;
            return Ok(data);
        }
    }
    Err("gameData.json not found".to_string())
}

#[tokio::main]
async fn main() {
    println!("============================================================");
    println!("   爆炒江湖计算器 - Rust 原生 RTX 3060 极速全栈服务端     ");
    println!("============================================================");

    println!("正在加载基础游戏数据 (gameData.json)...");
    let official_data = match load_official_game_data() {
        Ok(d) => d,
        Err(e) => {
            eprintln!("错误: {}", e);
            std::process::exit(1);
        }
    };
    println!(
        "官方数据加载完毕: {} 厨师, {} 菜谱, {} 技能",
        official_data.chefs.len(),
        official_data.recipes.len(),
        official_data.skills.len()
    );

    println!("正在初始化 GPU 引擎 (NVIDIA RTX 3060 / DirectX 12)...");
    let gpu = match GpuContext::init().await {
        Ok(g) => g,
        Err(e) => {
            eprintln!("GPU 初始化失败: {}", e);
            std::process::exit(1);
        }
    };

    println!("GPU 初始化成功！使用显卡: {}", gpu.gpu_name);
    let state = Arc::new(AppState {
        gpu,
        official_data,
    });

    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(tower_http::cors::Any);

    let api_router = Router::new()
        .route("/status", get(get_status))
        .route("/full_calculate", post(full_calculate))
        .route("/gpu_compute", post(compute_full))
        .route("/stage1", post(compute_stage1))
        .with_state(state)
        .layer(cors);

    let dist_path = if std::path::Path::new("./dist").exists() {
        std::path::PathBuf::from("./dist")
    } else if std::path::Path::new("../dist").exists() {
        std::path::PathBuf::from("../dist")
    } else {
        std::path::PathBuf::from("./dist")
    };

    let app = if dist_path.exists() {
        println!("挂载前端静态目录: {:?}", dist_path);
        let serve_dir = ServeDir::new(&dist_path);
        Router::new()
            .nest_service("/jisuanqi-zgf", serve_dir.clone())
            .fallback_service(serve_dir)
            .nest("/api", api_router)
    } else {
        Router::new().nest("/api", api_router)
    };

    let addr = "127.0.0.1:3000";
    println!("==> 服务端监听地址: http://{}", addr);

    let _ = open::that(format!("http://{}", addr));

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind to 127.0.0.1:3000");

    axum::serve(listener, app).await.unwrap();
}
