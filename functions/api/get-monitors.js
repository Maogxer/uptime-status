// uptime-status/functions/api/get-monitors.js

// Cloudflare Pages Functions 会自动将此文件映射到你的域名下的 /api/get-monitors 路径。
// onRequestPost 表示此函数将响应来自前端的 POST 请求。

export async function onRequestPost(context) {
    // 1. 从 Cloudflare Pages 环境变量中安全地获取 UptimeRobot API Key。
    // 这是防止 API Key 暴露给前端用户的关键步骤。
    const UPTIMEROBOT_API_KEY = context.env.UPTIMEROBOT_API_KEY;

    // 如果环境变量未设置，返回错误响应
    if (!UPTIMEROBOT_API_KEY) {
        return new Response('UptimeRobot API Key is not configured in Cloudflare Pages Environment Variables.', { status: 500 });
    }

    try {
        // 2. 解析前端发送的请求体。
        // 我们的前端将发送 JSON 格式的数据，即使是空对象。
        const requestBody = await context.request.json();

        // 3. 构建发送给 UptimeRobot API v2 的请求体。
        // UptimeRobot API v2 通常期望 `application/x-www-form-urlencoded` 格式的 POST 请求。
        const payload = new URLSearchParams({
            api_key: UPTIMEROBOT_API_KEY,      // 传入你的 API Key
            format: 'json',                    // 请求 JSON 格式的响应
            logs: '1',                         // 包含每个监控器的最新日志
            response_times: '1',               // 包含响应时间数据
            all_time_uptime_ratio: '1',        // 包含总运行时间百分比
            // 将前端可能传递的任何额外参数合并到 payload 中。
            // 例如，如果你想只获取特定的监控器：
            // monitors: requestBody.monitorIds || '', // 如果前端传递了 monitorIds 数组或字符串
            ...requestBody 
        }).toString(); // 将参数对象转换为 URL 编码的字符串

        // 4. 向 UptimeRobot API v2 发送服务器到服务器的请求。
        // 这种请求不受浏览器 CORS 策略的限制。
        const uptimeRobotResponse = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded' // UptimeRobot API 期望的 Content-Type
            },
            body: payload // 发送构建好的请求体
        });

        // 5. 检查 UptimeRobot API 的响应状态。
        // 如果响应不 OK (例如 4xx 或 5xx 错误)，则抛出错误。
        if (!uptimeRobotResponse.ok) {
            const errorText = await uptimeRobotResponse.text();
            console.error('UptimeRobot API Error:', uptimeRobotResponse.status, errorText);
            return new Response(`UptimeRobot API error: ${uptimeRobotResponse.status} - ${errorText}`, { status: uptimeRobotResponse.status });
        }

        // 6. 解析 UptimeRobot API 返回的 JSON 数据。
        const data = await uptimeRobotResponse.json();

        // 7. 将 UptimeRobot API 的响应数据作为 JSON 返回给前端。
        return new Response(JSON.stringify(data), {
            headers: {
                'Content-Type': 'application/json' // 告诉前端我们返回的是 JSON
            },
            status: 200 // 成功状态码
        });

    } catch (error) {
        // 捕获在函数执行过程中可能发生的任何错误
        console.error('Proxy function error:', error);
        return new Response(`Internal server error: ${error.message}`, { status: 500 });
    }
}