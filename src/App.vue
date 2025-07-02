<script setup>
import { ref, onMounted, computed } from 'vue';

// 定义响应式状态变量
const monitors = ref([]); // 存储从 UptimeRobot 获取的监控器数据
const loading = ref(true); // 指示数据是否正在加载
const error = ref(null);   // 存储可能发生的错误信息
const lastUpdated = ref(''); // 存储数据最后更新的时间

// 从 Cloudflare Pages Function 代理获取监控器数据的函数
const fetchMonitors = async () => {
  loading.value = true; // 开始加载，设置 loading 为 true
  error.value = null;   // 清除之前的错误信息
  try {
    // 向我们的 Cloudflare Pages Function 代理发送 POST 请求
    // 请求路径是 /api/get-monitors，它会自动路由到 functions/api/get-monitors.js
    const response = await fetch('/api/get-monitors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' // 前端向代理发送 JSON 格式的请求体
      },
      // 可以传递 UptimeRobot API v2 所需的任何额外参数。
      // 例如，如果你只想获取特定监控器：
      // body: JSON.stringify({
      //   monitors: '1234567,7890123', // 逗号分隔的监控器 ID 字符串
      // })
      // 如果不需要特定参数，发送一个空 JSON 对象即可
      body: JSON.stringify({}) 
    });

    // 检查 HTTP 响应是否成功 (状态码 2xx)
    if (!response.ok) {
      const errorData = await response.text(); // 获取错误响应的文本
      throw new Error(`HTTP 错误! 状态码: ${response.status}. 消息: ${errorData}`);
    }

    const data = await response.json(); // 解析 JSON 响应

    // UptimeRobot API v2 的标准响应结构是 { stat: "ok", monitors: [...] }
    if (data && data.stat === 'ok' && Array.isArray(data.monitors)) {
      monitors.value = data.monitors; // 更新监控器数据
    } else {
      // 如果响应结构不符合预期，抛出错误
      throw new Error('API 响应结构不符合预期或 stat 不为 "ok"。');
    }

    // 更新最后更新时间
    lastUpdated.value = new Date().toLocaleString();

  } catch (err) {
    // 捕获任何请求或处理过程中发生的错误
    console.error('获取监控器数据时出错:', err);
    error.value = `加载监控器失败: ${err.message}。请检查控制台获取更多详情。`;
  } finally {
    loading.value = false; // 数据加载完成，设置 loading 为 false
  }
};

// 将 UptimeRobot v2 的状态码映射为人类可读的文本和颜色
const getStatusDetails = (status) => {
  switch (status) {
    case 0: return { text: '已暂停', color: '#999' }; // Paused (灰色)
    case 1: return { text: '未检查', color: '#ccc' }; // Not Checked Yet (浅灰色)
    case 2: return { text: '正常运行', color: '#28a745' }; // Up (绿色)
    case 8: return { text: '似乎故障', color: '#ffc107' }; // Seems Down (橙色) - 可能是临时问题
    case 9: return { text: '故障', color: '#dc3545' }; // Down (红色)
    default: return { text: '未知', color: '#6c757d' }; // Unknown (深灰色)
  }
};

// 计算属性：过滤出不同状态的监控器数量
const operationalMonitors = computed(() =>
  monitors.value.filter(m => m.status === 2) // 状态码 2 表示“正常运行”
);

const downMonitors = computed(() =>
  monitors.value.filter(m => m.status === 9) // 状态码 9 表示“故障”
);

const pausedMonitors = computed(() =>
  monitors.value.filter(m => m.status === 0) // 状态码 0 表示“已暂停”
);

// 获取监控器的最新日志信息
const getLatestLog = (monitor) => {
  // 检查是否存在日志且日志数组不为空
  if (monitor.logs && monitor.logs.length > 0) {
    const latestLog = monitor.logs[0]; // UptimeRobot 返回的日志通常是按时间倒序排列的
    const date = new Date(latestLog.datetime * 1000); // UptimeRobot datetime 是 Unix 时间戳（秒），需要转换为毫秒
    const type = latestLog.type; // 日志类型：1=down, 2=up, 9=paused
    
    let typeText = '';
    if (type === 1) typeText = '下线';
    else if (type === 2) typeText = '上线';
    else if (type === 9) typeText = '暂停';

    return `${typeText}于 ${date.toLocaleString()}`; // 返回格式化的日志信息
  }
  return '无日志'; // 如果没有日志，则显示“无日志”
};


// 组件挂载时执行：
onMounted(() => {
  fetchMonitors(); // 首次加载数据
  // 可选：每隔 5 分钟刷新数据 (5 * 60 * 1000 毫秒)
  setInterval(fetchMonitors, 5 * 60 * 1000); 
});
</script>

<template>
  <div class="status-panel">
    <h1>站点状态监测</h1>

    <!-- 加载状态显示 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>正在加载监控器数据...</p>
    </div>

    <!-- 错误信息显示 -->
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="fetchMonitors">重试</button>
    </div>

    <!-- 数据加载成功后的显示 -->
    <div v-else>
      <p class="last-updated">最后更新时间: {{ lastUpdated }}</p>

      <!-- 状态汇总区域 -->
      <div class="summary">
        <div class="summary-item operational">
          <strong>上线中:</strong> {{ operationalMonitors.length }}
        </div>
        <div class="summary-item down">
          <strong>故障中:</strong> {{ downMonitors.length }}
        </div>
        <div class="summary-item paused">
          <strong>已暂停:</strong> {{ pausedMonitors.length }}
        </div>
      </div>

      <!-- 监控器列表 -->
      <div class="monitor-list">
        <h2>所有监控器</h2>
        <div v-for="monitor in monitors" :key="monitor.id" class="monitor-card">
          <div class="monitor-header">
            <div class="monitor-name">{{ monitor.friendly_name }}</div>
            <div class="monitor-status" :style="{ backgroundColor: getStatusDetails(monitor.status).color }">
              {{ getStatusDetails(monitor.status).text }}
            </div>
          </div>
          <div class="monitor-details">
            <!-- 显示总运行时间百分比 -->
            <div v-if="monitor.all_time_uptime_ratio" class="monitor-uptime">
              总运行时间: {{ monitor.all_time_uptime_ratio }}%
            </div>
            <!-- 显示平均响应时间 -->
            <div v-if="monitor.average_response_time" class="monitor-response-time">
              平均响应: {{ monitor.average_response_time }}ms
            </div>
            <!-- 显示监控 URL -->
            <div v-if="monitor.url" class="monitor-url">
              URL: <a :href="monitor.url" target="_blank">{{ monitor.url }}</a>
            </div>
            <!-- 显示最新日志 -->
            <div v-if="monitor.logs && monitor.logs.length > 0" class="monitor-last-log">
              最新日志: {{ getLatestLog(monitor) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* 基础 CSS 样式 */
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f4f7f6;
  color: #333;
  margin: 0;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
}

.status-panel {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  padding: 30px;
  max-width: 900px;
  width: 100%;
  box-sizing: border-box;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 25px;
  font-size: 2.2em;
}

/* 加载和错误信息样式 */
.loading, .error-message {
  text-align: center;
  padding: 30px;
  font-size: 1.1em;
  color: #555;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #dc3545;
}

.error-message button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  margin-top: 15px;
}

.error-message button:hover {
  background-color: #0056b3;
}

.last-updated {
  text-align: right;
  font-size: 0.9em;
  color: #666;
  margin-bottom: 20px;
}

/* 状态汇总区域样式 */
.summary {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30px;
  padding: 15px 0;
  border-bottom: 1px solid #eee;
  border-top: 1px solid #eee;
}

.summary-item {
  text-align: center;
  font-size: 1.1em;
  padding: 0 15px;
}

.summary-item.operational strong { color: #28a745; } /* 绿色 */
.summary-item.down strong { color: #dc3545; }       /* 红色 */
.summary-item.paused strong { color: #999; }        /* 灰色 */


/* 监控器列表样式 */
.monitor-list h2 {
  text-align: center;
  color: #555;
  margin-bottom: 20px;
  font-size: 1.8em;
}

.monitor-card {
  background-color: #fefefe;
  border: 1px solid #eee;
  border-radius: 6px;
  margin-bottom: 15px;
  padding: 15px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease-in-out;
}

.monitor-card:hover {
  transform: translateY(-3px);
}

.monitor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.monitor-name {
  flex-grow: 1;
  font-weight: bold;
  font-size: 1.1em;
  color: #444;
}

.monitor-status {
  padding: 6px 12px;
  border-radius: 5px;
  color: white;
  font-weight: bold;
  font-size: 0.85em;
  margin-left: 15px;
  text-align: center;
  min-width: 70px;
}

.monitor-details {
  font-size: 0.9em;
  color: #777;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px; /* 行间距，列间距 */
}

.monitor-details div {
  white-space: nowrap; /* 防止细节信息换行 */
}

.monitor-details a {
  color: #007bff;
  text-decoration: none;
}

.monitor-details a:hover {
  text-decoration: underline;
}

/* 响应式调整 */
@media (max-width: 600px) {
  .status-panel {
    padding: 20px;
  }
  h1 {
    font-size: 1.8em;
  }
  .summary {
    flex-direction: column;
    align-items: center;
  }
  .summary-item {
    margin-bottom: 10px;
  }
  .monitor-card {
    padding: 15px;
  }
  .monitor-header {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 10px;
  }
  .monitor-name {
    margin-bottom: 8px;
    width: 100%;
  }
  .monitor-status {
    margin-left: 0;
    width: 100%;
    box-sizing: border-box;
  }
  .monitor-details {
    flex-direction: column;
    gap: 5px;
  }
}
</style>