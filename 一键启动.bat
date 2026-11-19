@echo off
chcp 65001 >nul
title 爆炒江湖计算器 - RTX 3060 原生 GPU 加速版
echo ============================================================
echo   正在启动 爆炒江湖计算器 (Rust 原生 RTX 3060 GPU 加速版)...
echo ============================================================
echo.
echo 提示：服务启动后将自动使用默认浏览器打开计算器页面。
echo 页面右上角或控制台将显示已连接 NVIDIA GeForce RTX 3060 显卡。
echo.
"%~dp0jisuanqi-gpu.exe"
pause
