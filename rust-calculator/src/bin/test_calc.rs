#[path = "../calculator.rs"]
mod calculator;
#[path = "../global_addition.rs"]
mod global_addition;
#[path = "../gpu_calculator.rs"]
mod gpu_calculator;
#[path = "../models.rs"]
mod models;
#[path = "../search.rs"]
mod search;
#[path = "../skill_effect.rs"]
mod skill_effect;
#[path = "../solver.rs"]
mod solver;

use gpu_calculator::GpuContext;
use models::*;
use std::fs;

#[tokio::main]
async fn main() {
    println!("=== Testing Rust Solver on RPCVGR ===");

    let game_data_str = fs::read_to_string("./gameData.json")
        .or_else(|_| fs::read_to_string("../gameData.json"))
        .expect("Read gameData.json");
    let official_data: OfficialGameDataRaw =
        serde_json::from_str(&game_data_str).expect("Parse gameData.json");

    let my_data_str = fs::read_to_string("./myGameData_RPCVGR.json")
        .or_else(|_| fs::read_to_string("../myGameData_RPCVGR.json"))
        .expect("Read myGameData_RPCVGR.json");
    let my_game_data: MyGameDataRaw =
        serde_json::from_str(&my_data_str).expect("Parse myGameData_RPCVGR.json");

    let rule_str = fs::read_to_string("./rule.json")
        .or_else(|_| fs::read_to_string("../rule.json"))
        .expect("Read rule.json");
    let rule_data: RuleDataRaw = serde_json::from_str(&rule_str).expect("Parse rule.json");

    let config = CalConfig::default();

    println!("Initializing GPU...");
    let gpu = GpuContext::init().await.expect("GPU Init");

    println!("Running solve_full...");
    let start = std::time::Instant::now();
    let result = solver::solve_full(&official_data, &my_game_data, &rule_data, &config, &gpu)
        .await
        .expect("Solve full");
    let elapsed = start.elapsed();

    println!("=== RESULT ===");
    println!("Time: {}ms", elapsed.as_millis());
    println!("Score: {}", result.score);
    for (i, chef) in result.chefs.iter().enumerate() {
        println!(
            "Chef {}: {} (Equip: {})",
            i + 1,
            chef.chef,
            if chef.equip.is_empty() {
                "None"
            } else {
                &chef.equip
            }
        );
        for d in &chef.recipes {
            println!(
                "   - {} x{} (Single: {}, Total: {})",
                d.recipe, d.count, d.single_price, d.total_price
            );
        }
    }
}
