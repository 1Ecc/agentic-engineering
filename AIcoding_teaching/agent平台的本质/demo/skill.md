---
name: realtime-weather
description: 查询实时天气时使用 wttr.in，通过 curl 获取真实数据，避免模型凭训练记忆编造。
---

## 查实时天气
需要查询某地当前天气时，用 wttr.in（公共服务，免费、无需 API key）：
命令:curl -s "wttr.in/Beijing?format=3"
把 Beijing 换成用户问的城市（用英文城市名最稳，如 Shanghai、Shenzhen、Hangzhou）。
