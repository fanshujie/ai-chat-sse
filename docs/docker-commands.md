# Docker / Linux 常用命令速查（D5）

## 镜像与容器

```bash
docker build -t 名字 .               # 构建（. 是构建上下文）
docker images                        # 看镜像和体积
docker run --rm -p 3001:3001 --env-file .env 名字
docker ps -a                         # 所有容器（含已退出）
docker logs -f --tail 100 容器ID      # 追日志
docker exec -it 容器ID sh             # 进容器
docker inspect 容器ID                 # 看挂载 / 网络 / 环境变量
docker stats                         # 实时资源占用
docker system df                     # 磁盘占用
docker system prune -a               # 清无用镜像（慎用）
```

## Compose

```bash
docker compose up -d                 # 后台起
docker compose ps                    # 只看运行中的
docker compose logs -f --tail 50     # 追日志
docker compose restart
docker compose down                  # 停并删容器（不删镜像）
docker compose up -d --force-recreate # 改了端口映射等配置后强制重建
```

## 现场排障（Linux）

```bash
ss -lntp | grep 3001                 # 端口被谁占
ps aux | grep node                   # 进程
df -h                                # 磁盘满没满
du -sh *                             # 目录大小
curl -I http://127.0.0.1:3001        # 通不通
grep -rn "关键词" .                   # 找配置
tail -f 日志文件                      # 跟日志
```

## 本项目的三条固定命令

```bash
docker build -t ai-chat .
docker run --rm -p 3001:3001 --env-file .env ai-chat
docker compose up -d
```

## 踩过的坑（面试可讲）

1. `--rm` 只在容器**退出**时删容器；没停就一直占着端口，再 compose 起会报
   `Bind for 0.0.0.0:3001 failed: port is already allocated`。
   处理：`docker ps` 找到 → `docker rm -f <名字>`。
2. 上次创建失败留下的容器，`docker compose up -d` 只会 `Starting`，会沿用坏的网络配置（端口没映射）。
   处理：`docker compose down` 再 `up -d`，或加 `--force-recreate`。
3. `.env` 不能 `COPY` 进镜像（分层，删了还在层里），必须运行时 `--env-file` / `env_file` 注入。
