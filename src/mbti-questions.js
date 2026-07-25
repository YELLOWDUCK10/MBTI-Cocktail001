/**
 * mbti-questions.js - MBTI 快速测试题库
 *
 * 4 道题，每道对应一个维度：
 * 1. E/I - 外向 vs 内向
 * 2. S/N - 实感 vs 直觉
 * 3. T/F - 思考 vs 情感
 * 4. J/P - 判断 vs 感知
 *
 * 每题有两个选项，分别对应维度的两极。
 * 如果时间允许，可以扩展为更多题目以提高准确率。
 */

export const MBTI_QUESTIONS = [
  {
    id: 1,
    dimension: 'EI',
    title: '第一题：社交方式',
    question: '在一个热闹的酒吧里，你更倾向于？',
    options: [
      {
        value: 'E',
        text: '主动与周围的人攀谈，结识新朋友',
        icon: '🥂',
        description: '你喜欢成为聚会中的活跃分子，从社交中获得能量。'
      },
      {
        value: 'I',
        text: '独自品味手中的酒，享受独处的时光',
        icon: '🍷',
        description: '你享受安静的氛围，一个人待着让你感到舒适和充实。'
      }
    ]
  },
  {
    id: 2,
    dimension: 'SN',
    title: '第二题：品味偏好',
    question: '面对一杯从未尝试过的鸡尾酒，你首先注意到什么？',
    options: [
      {
        value: 'S',
        text: '它的颜色、杯型、装饰——视觉呈现和实际口感',
        icon: '👁️',
        description: '你关注具体可感知的细节，相信自己的五感体验。'
      },
      {
        value: 'N',
        text: '它背后的故事、创作灵感——调酒师想表达什么',
        icon: '✨',
        description: '你善于联想，关注事物背后的意义和可能性。'
      }
    ]
  },
  {
    id: 3,
    dimension: 'TF',
    title: '第三题：决策方式',
    question: '朋友请你推荐一款酒，你会怎么选？',
    options: [
      {
        value: 'T',
        text: '分析他的口味偏好，列出几款客观匹配的选择',
        icon: '📊',
        description: '你依据逻辑和分析做决策，追求客观公正。'
      },
      {
        value: 'F',
        text: '根据你对他的了解，选一款能让他开心的酒',
        icon: '💝',
        description: '你更看重人与人之间的情感连接，追求和谐与温暖。'
      }
    ]
  },
  {
    id: 4,
    dimension: 'JP',
    title: '第四题：生活节奏',
    question: '周五晚上，你打算调一杯酒放松，你会？',
    options: [
      {
        value: 'J',
        text: '提前准备好所有材料和配方，按步骤精确调制',
        icon: '📋',
        description: '你喜欢有计划、有条理地做事，享受按部就班的确定性。'
      },
      {
        value: 'P',
        text: '打开冰箱看看有什么，即兴发挥创造一杯新配方',
        icon: '🎨',
        description: '你享受随性和灵活，在即兴创作中找到乐趣。'
      }
    ]
  }
];

export default MBTI_QUESTIONS;
