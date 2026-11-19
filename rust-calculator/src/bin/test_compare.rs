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
    println!("=== Testing Solver on Old vs New Official Data ===");

    let old_data_str = fs::read_to_string("./gameData.json").expect("Read old gameData.json");
    let old_official: OfficialGameDataRaw = serde_json::from_str(&old_data_str).expect("Parse old gameData");

    let new_data_str = fs::read_to_string("./new_gameData.json").expect("Read new gameData.json");
    let new_official: OfficialGameDataRaw = serde_json::from_str(&new_data_str).expect("Parse new gameData");

    let my_data_str = fs::read_to_string("./myGameData_RPCVGR.json").expect("Read myGameData_RPCVGR.json");
    let my_game_data: MyGameDataRaw = serde_json::from_str(&my_data_str).expect("Parse myGameData");

    let rule_str = fs::read_to_string("./rule.json").expect("Read rule.json");
    let rule_data: RuleDataRaw = serde_json::from_str(&rule_str).expect("Parse rule.json");

    let config = CalConfig::default();

    println!("Initializing GPU...");
    let gpu = GpuContext::init().await.expect("GPU Init");

    println!("\n>>> Running with OLD official data (962 recipes, 724 chefs)...");
    let res_old = solver::solve_full(&old_official, &my_game_data, &rule_data, &config, &gpu)
        .await
        .expect("Old solve");
    println!("Old Result Score: {}", res_old.score);
    for (i, chef) in res_old.chefs.iter().enumerate() {
        println!("  Chef {}: {} (Equip: {})", i + 1, chef.chef, chef.equip);
        for r in &chef.recipes {
            println!("     - {} x{} (Single: {}, Total: {})", r.recipe, r.count, r.single_price, r.total_price);
        }
    }

    println!("\n>>> Running with NEW official data (1059 recipes, 826 chefs)...");
    let res_new = solver::solve_full(&new_official, &my_game_data, &rule_data, &config, &gpu)
        .await
        .expect("New solve");
    println!("New Result Score: {}", res_new.score);
    for (i, chef) in res_new.chefs.iter().enumerate() {
        println!("  Chef {}: {} (Equip: {})", i + 1, chef.chef, chef.equip);
        for r in &chef.recipes {
            println!("     - {} x{} (Single: {}, Total: {})", r.recipe, r.count, r.single_price, r.total_price);
        }
    }
}
