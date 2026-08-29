/**
 * mbti-profiles.js - 16 种 MBTI 人格类型的中文描述
 *
 * 每种类型包含：
 * - name: 中文名称
 * - title: 角色称号
 * - description: 一句话描述
 * - traits: 关键特质
 * - cocktailPreference: 鸡尾酒偏好描述
 * - strengths: 优势
 * - suitable: 适合的场景
 */

export const MBTI_PROFILES = {
  INTJ: {
    myth: '哈迪斯',
    name: '建筑师',
    title: '战略家',
    description: '富有想象力和战略性的思考者，对一切都有计划。',
    traits: ['独立', '理性', '果断', '有远见'],
    cocktailPreference: '偏爱复杂而有层次感的经典鸡尾酒，欣赏调酒师的技艺与配方的精妙平衡。',
    strengths: '战略思维、独立判断、高度自律',
    suitable: '商务洽谈、深夜独酌'
  },
  INTP: {
    myth: '普罗米修斯',
    name: '逻辑学家',
    title: '发明家',
    description: '具有创新精神的思考者，对知识有着永不满足的渴望。',
    traits: ['好奇', '分析', '创新', '客观'],
    cocktailPreference: '热衷于探索小众配方和实验性调酒，喜欢理解每款酒背后的化学原理。',
    strengths: '逻辑分析、创新思维、知识渊博',
    suitable: '实验室风格酒吧、创意调酒体验'
  },
  ENTJ: {
    myth: '宙斯',
    name: '指挥官',
    title: '领导者',
    description: '大胆、富有想象力的领导者，总能找到解决问题的方法。',
    traits: ['果断', '自信', '魅力', '高效'],
    cocktailPreference: '选择有存在感的经典烈酒，欣赏果断而有力的风味表达。',
    strengths: '领导能力、战略规划、坚定果断',
    suitable: '高端商务酒吧、庆功宴'
  },
  ENTP: {
    myth: '赫尔墨斯',
    name: '辩论家',
    title: '发明家',
    description: '聪明好奇的思考者，不会被智力挑战吓倒。',
    traits: ['机智', '善辩', '好奇', '精力充沛'],
    cocktailPreference: '喜欢尝试各种新奇的鸡尾酒，享受与调酒师探讨配方改良的可能性。',
    strengths: '创意迸发、辩论能力、适应力强',
    suitable: '潮流酒吧、社交聚会'
  },
  INFJ: {
    myth: '阿波罗',
    name: '提倡者',
    title: '守护者',
    description: '安静而神秘，但激励人心且不知疲倦的理想主义者。',
    traits: ['洞察', '利他', '坚定', '神秘'],
    cocktailPreference: '被有故事、有深度的酒所吸引，欣赏调酒师的用心与情感注入。',
    strengths: '深度洞察、共情能力、坚定信念',
    suitable: '安静的小酒馆、私密聚会'
  },
  INFP: {
    myth: '珀耳塞福涅',
    name: '调停者',
    title: '理想主义者',
    description: '诗意、善良的利他主义者，总是热衷于帮助美好的事业。',
    traits: ['理想', '敏感', '创意', '忠诚'],
    cocktailPreference: '喜欢柔和、圆润的风味，更看重喝酒时的心情和氛围。',
    strengths: '创造力、共情力、理想主义',
    suitable: '文艺咖啡馆、日落露台'
  },
  ENFJ: {
    myth: '得墨忒耳',
    name: '主人公',
    title: '导师',
    description: '富有魅力且鼓舞人心的领导者，能让人为之着迷。',
    traits: ['魅力', '利他', '领导', '热情'],
    cocktailPreference: '喜欢分享式的鸡尾酒体验，享受推荐好酒给朋友并获得认同的感觉。',
    strengths: '感染力、共情力、领导魅力',
    suitable: '主题派对、社交晚宴'
  },
  ENFP: {
    myth: '狄俄尼索斯',
    name: '竞选者',
    title: '探索者',
    description: '热情、富有创造力的自由灵魂，总能找到微笑的理由。',
    traits: ['热情', '创意', '社交', '自由'],
    cocktailPreference: '热爱色彩缤纷的热带鸡尾酒，每到一个新地方都要尝试当地的特色调酒。',
    strengths: '热情感染力、社交能力、创意无限',
    suitable: '泳池派对、音乐节、旅行酒吧'
  },
  ISTJ: {
    myth: '忒弥斯',
    name: '物流师',
    title: '守护者',
    description: '务实且注重事实的个人，其可靠性不容置疑。',
    traits: ['可靠', '务实', '有序', '负责'],
    cocktailPreference: '偏好经典配方和传统调制方法，对出品的一致性有很高要求。',
    strengths: '可靠务实、条理分明、专注细节',
    suitable: '传统英式酒吧、威士忌品鉴会'
  },
  ISFJ: {
    myth: '赫拉',
    name: '守卫者',
    title: '守护者',
    description: '非常专注和温暖的守护者，随时准备保护所爱之人。',
    traits: ['温暖', '忠诚', '细心', '奉献'],
    cocktailPreference: '喜欢温和、甜美的酒款，更注重喝酒时陪伴的人而非酒本身。',
    strengths: '细致关怀、忠诚可靠、默默付出',
    suitable: '温馨的家庭聚会、闺蜜之夜'
  },
  ESTJ: {
    myth: '雅典娜',
    name: '总经理',
    title: '执行者',
    description: '优秀的管理者，在管理事务或人员方面无与伦比。',
    traits: ['高效', '务实', '果断', '有条理'],
    cocktailPreference: '偏好直接、有力的经典烈酒，不喜欢过于花哨的调配。',
    strengths: '执行力强、组织能力、决断力',
    suitable: '商务晚宴、威士忌酒吧'
  },
  ESFJ: {
    myth: '赫斯提亚',
    name: '执政官',
    title: '照顾者',
    description: '非常关心他人，受欢迎且善于社交，总是乐于助人。',
    traits: ['热情', '尽责', '合作', '善交际'],
    cocktailPreference: '喜欢大众化的流行鸡尾酒，享受在聚会中为大家点酒的过程。',
    strengths: '社交能力、组织协调、关心他人',
    suitable: '生日派对、欢乐时光'
  },
  ISTP: {
    myth: '赫菲斯托斯',
    name: '鉴赏家',
    title: '实干家',
    description: '大胆而实际的实验者，精通各种工具。',
    traits: ['冷静', '务实', '动手', '冒险'],
    cocktailPreference: '对调酒工具和技法充满兴趣，甚至想自己在家尝试调制。',
    strengths: '动手能力、临危不乱、实用主义',
    suitable: '手工调酒吧、户外烧烤'
  },
  ISFP: {
    myth: '阿尔忒弥斯',
    name: '探险家',
    title: '艺术家',
    description: '灵活而富有魅力的艺术家，随时准备探索和体验新事物。',
    traits: ['艺术', '敏感', '随和', '魅力'],
    cocktailPreference: '被颜值高的鸡尾酒吸引，拍照是第一步骤，口感和外观同等重要。',
    strengths: '审美力、适应力、艺术感知',
    suitable: '艺术展酒会、网红打卡酒吧'
  },
  ESTP: {
    myth: '阿瑞斯',
    name: '企业家',
    title: '冒险家',
    description: '聪明、精力充沛、非常敏锐，真正享受冒险的乐趣。',
    traits: ['大胆', '直接', '善交际', '务实'],
    cocktailPreference: '喜欢高烈度的 shot 和直接有力的口感，享受酒吧里的刺激氛围。',
    strengths: '行动力、社交能力、风险评估',
    suitable: '运动酒吧、电音派对'
  },
  ESFP: {
    myth: '阿芙洛狄忒',
    name: '表演者',
    title: '表演家',
    description: '自发的、精力充沛的表演者，生活永远不会在他们身边无聊。',
    traits: ['活泼', '即兴', '社交', '热情'],
    cocktailPreference: '派对上的焦点，喜欢色彩鲜艳、造型夸张的鸡尾酒，最好还能点火。',
    strengths: '感染力、即兴能力、生活热情',
    suitable: '夜店、泳池派对、狂欢节'
  }
};

export default MBTI_PROFILES;
