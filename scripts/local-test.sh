#!/bin/bash
# 本地测试脚本 - 模拟 GitHub Action 的执行流程

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACTION_ROOT="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo "本地测试 Website to Electron Action"
echo "========================================="

# 创建测试网站目录（如果不存在）
TEST_SITE_DIR="${ACTION_ROOT}/test-site"
if [ ! -d "$TEST_SITE_DIR" ]; then
    echo "创建测试网站目录: $TEST_SITE_DIR"
    mkdir -p "$TEST_SITE_DIR"
    cat > "$TEST_SITE_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Website</title>
    <style>
        body { font-family: system-ui; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; margin: 0; }
        h1 { font-size: 3rem; }
        p { font-size: 1.2rem; opacity: 0.9; }
        .info { background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px; margin-top: 20px; }
    </style>
</head>
<body>
    <h1>🎉 测试网站</h1>
    <p>如果你看到这个页面，说明 Electron 打包成功！</p>
    <div class="info">
        <p><strong>测试时间:</strong> <span id="time"></span></p>
        <p><strong>User Agent:</strong> <span id="ua"></span></p>
    </div>
    <script>
        document.getElementById('time').textContent = new Date().toLocaleString();
        document.getElementById('ua').textContent = navigator.userAgent;
    </script>
</body>
</html>
EOF
    echo "✓ 测试网站已创建"
fi

cd "$ACTION_ROOT"

# Step 1: 安装依赖
echo ""
echo "[Step 1/4] 安装依赖..."
npm ci

# Step 2: 设置环境变量并运行准备脚本
echo ""
echo "[Step 2/4] 运行准备脚本..."
export GITHUB_WORKSPACE="$ACTION_ROOT"
export SITE_PATH="test-site"
export APP_NAME="test-electron-app"
export PRODUCT_NAME="Test Electron App"
export APP_VERSION="1.0.0-test"
export APP_DESCRIPTION="Local test of the GitHub Action"
export AUTHOR="Local Tester"
export AUTO_UPDATE="false"
# 如果需要测试自动更新功能，取消下面的注释
# export AUTO_UPDATE="true"
# export GITHUB_OWNER="your-username"
# export GITHUB_REPO="your-repo"

node scripts/prepare-action.js

# Step 3: 选择运行模式
echo ""
echo "========================================="
echo "选择测试模式:"
echo "  1) 启动开发模式 (npm start) - 快速预览"
echo "  2) 构建完整安装包 (npm run make)"
echo "  3) 两者都执行"
echo "========================================="
read -p "请输入选项 [1/2/3] (默认: 1): " choice

case "${choice:-1}" in
    1)
        echo ""
        echo "[Step 3/4] 启动 Electron 开发模式..."
        npm start
        ;;
    2)
        echo ""
        echo "[Step 3/4] 构建安装包..."
        npm run make
        echo ""
        echo "✓ 构建完成！安装包位置: $ACTION_ROOT/out/make/"
        ls -la "$ACTION_ROOT/out/make/" 2>/dev/null || echo "（等待构建完成）"
        ;;
    3)
        echo ""
        echo "[Step 3/4] 启动 Electron 开发模式..."
        npm start
        echo ""
        echo "[Step 4/4] 构建安装包..."
        npm run make
        echo ""
        echo "✓ 构建完成！安装包位置: $ACTION_ROOT/out/make/"
        ls -la "$ACTION_ROOT/out/make/"
        ;;
    *)
        echo "无效选项，退出"
        exit 1
        ;;
esac

echo ""
echo "========================================="
echo "✓ 本地测试完成！"
echo "========================================="
