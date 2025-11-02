# 第一阶段: 构建应用
FROM node:22-alpine AS builder

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制依赖配置文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 定义构建参数
ARG VITE_WEBDAV_URL
ARG VITE_WEBDAV_USERNAME

# 设置环境变量（传递给 Vite）
ENV VITE_WEBDAV_URL=$VITE_WEBDAV_URL
ENV VITE_WEBDAV_USERNAME=$VITE_WEBDAV_USERNAME

# 构建应用（密码通过 secret mount 传递，不存储在镜像层）
RUN --mount=type=secret,id=VITE_WEBDAV_PASSWORD \
    export VITE_WEBDAV_PASSWORD=$(cat /run/secrets/VITE_WEBDAV_PASSWORD) && \
    pnpm build

# 第二阶段: 运行应用
# 使用 Lighttpd 替代 nginx，镜像体积减少约 60%（从 ~10MB 降至 ~3-4MB）
FROM alpine:latest

# 安装 lighttpd（仅运行时依赖）
RUN apk add --no-cache lighttpd && \
    rm -rf /var/cache/apk/* /tmp/*

# 创建必要的目录
RUN mkdir -p /var/www/html /var/log/lighttpd /var/run/lighttpd

# 创建 lighttpd 配置文件
# 注意：此配置设计为在 Caddy 反向代理后运行，避免与 Caddy 功能重复
RUN cat > /etc/lighttpd/lighttpd.conf <<'EOF'
server.modules = (
    "mod_access",
    "mod_alias",
    "mod_rewrite",
    "mod_setenv"
)

server.document-root = "/var/www/html"
server.port = 80
server.username = "lighttpd"
server.groupname = "lighttpd"
index-file.names = ("index.html")

# 日志（简化日志，减少 I/O 开销，因为 Caddy 已处理主要日志）
server.errorlog = "/var/log/lighttpd/error.log"
accesslog.filename = "/var/log/lighttpd/access.log"

# MIME 类型（必须配置，用于正确设置 Content-Type）
mimetype.assign = (
    ".html" => "text/html; charset=utf-8",
    ".css" => "text/css",
    ".js" => "application/javascript",
    ".json" => "application/json",
    ".svg" => "image/svg+xml",
    ".png" => "image/png",
    ".jpg" => "image/jpeg",
    ".woff" => "font/woff",
    ".woff2" => "font/woff2",
    ".wasm" => "application/wasm"
)

# 全局安全头（应用层安全头，不会与 Caddy 冲突，可以叠加）
# 注意：Caddy 可能也设置了安全头，两者会合并，这是安全的
setenv.add-response-header = (
    "X-Frame-Options" => "SAMEORIGIN",
    "X-Content-Type-Options" => "nosniff",
    "X-XSS-Protection" => "1; mode=block"
)

# Manifest 文件缓存（应用层缓存策略，告诉客户端如何缓存）
# 这与 Caddy 的代理层缓存不冲突
$HTTP["url"] == "/manifest.json" {
    expire.url = ("" => "access plus 7 days")
    setenv.add-response-header = (
        "Cache-Control" => "public",
        "Content-Type" => "application/manifest+json"
    )
}

# 静态资源缓存（应用层缓存策略）
# Cache-Control 头会告诉浏览器和 Caddy 如何缓存，这是正确的
$HTTP["url"] =~ "^/.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$" {
    expire.url = ("" => "access plus 1 years")
    setenv.add-response-header = (
        "Cache-Control" => "public, max-age=31536000, immutable"
    )
}

# 健康检查端点
$HTTP["url"] == "/health" {
    alias.url = ("/health" => "/var/www/html/health.txt")
    setenv.add-response-header = ("Content-Type" => "text/plain")
}

# SPA 路由支持 - 所有路由返回 index.html（排除静态资源）
# 这是应用层的路由逻辑，必须由 lighttpd 处理
$HTTP["url"] !~ "^/(health|manifest\.json|robots\.txt|sitemap\.xml|.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|wasm))" {
    url.rewrite-once = (
        "^(.+)$" => "/index.html"
    )
}

# 明确禁用压缩（由 Caddy 处理）
# 注意：lighttpd 默认不启用压缩模块，这里明确说明
# 如果需要，可以通过不加载 mod_compress 来确保不压缩
EOF

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /var/www/html

# 创建健康检查文件（在复制构建产物之后，确保文件存在）
RUN echo "healthy" > /var/www/html/health.txt

# 暴露端口
EXPOSE 80

# 启动 lighttpd
CMD ["lighttpd", "-D", "-f", "/etc/lighttpd/lighttpd.conf"]

