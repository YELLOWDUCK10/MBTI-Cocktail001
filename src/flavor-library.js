/**
 * flavor-library.js - 风味成分库
 *
 * 从现有29款鸡尾酒中提取所有风味成分，按类别组织。
 * 供 AI 生成模块从中按 MBTI 偏好随机组合新配方。
 */

// ==================== 基酒库 ====================
export const BASE_SPIRITS = {
  gin: { name: '金酒', abv: 42, flavors: ['杜松子', '草本', '柑橘'] },
  vodka: { name: '伏特加', abv: 40, flavors: ['中性', '纯净'] },
  rum_white: { name: '白朗姆酒', abv: 40, flavors: ['清爽', '微甜'] },
  rum_dark: { name: '黑朗姆酒', abv: 40, flavors: ['焦糖', '香草'] },
  rum_aged: { name: '陈年朗姆酒', abv: 40, flavors: ['橡木', '焦糖', '热带水果'] },
  whiskey_bourbon: { name: '波本威士忌', abv: 45, flavors: ['焦糖', '香草', '橡木'] },
  whiskey_rye: { name: '黑麦威士忌', abv: 45, flavors: ['辛辣', '胡椒', '焦糖'] },
  tequila_blanco: { name: '龙舌兰酒', abv: 40, flavors: ['龙舌兰', '柑橘', '胡椒'] },
  tequila_mezcal: { name: '梅斯卡尔酒', abv: 45, flavors: ['烟熏', '龙舌兰', '泥土'] }
};

// ==================== 酸味剂 ====================
export const ACIDIFIERS = [
  { name: '新鲜柠檬汁', amount: '22', unit: 'ml', flavors: ['柑橘', '明亮'] },
  { name: '新鲜青柠汁', amount: '22', unit: 'ml', flavors: ['青柠', '清爽'] },
  { name: '西柚汁', amount: '30', unit: 'ml', flavors: ['西柚', '微苦', '清爽'] },
  { name: '橙汁', amount: '45', unit: 'ml', flavors: ['橙子', '甜美', '果味'] },
  { name: '蔓越莓汁', amount: '30', unit: 'ml', flavors: ['蔓越莓', '微酸', '果味'] },
  { name: '菠萝汁', amount: '60', unit: 'ml', flavors: ['菠萝', '热带', '甜美'] },
  { name: '番茄汁', amount: '90', unit: 'ml', flavors: ['番茄', '咸味', '浓郁'] }
];

// ==================== 甜味剂 ====================
export const SWEETENERS = [
  { name: '单糖浆', amount: '15', unit: 'ml', flavors: ['中性甜'] },
  { name: '蜂蜜糖浆', amount: '15', unit: 'ml', flavors: ['蜂蜜', '花香'] },
  { name: '龙舌兰糖浆', amount: '10', unit: 'ml', flavors: ['龙舌兰', '微甜'] },
  { name: '红石榴糖浆', amount: '15', unit: 'ml', flavors: ['石榴', '果味', '甜'] },
  { name: '覆盆子糖浆', amount: '15', unit: 'ml', flavors: ['覆盆子', '莓果', '花香'] },
  { name: '杏仁糖浆', amount: '10', unit: 'ml', flavors: ['杏仁', '坚果', '甜'] },
  { name: '肉桂糖浆', amount: '10', unit: 'ml', flavors: ['肉桂', '香料', '温暖'] },
  { name: '白砂糖', amount: '10', unit: 'g', flavors: ['纯净甜'] }
];

// ==================== 利口酒/风味剂 ====================
export const MODIFIERS = [
  { name: '甜味美思', amount: '30', unit: 'ml', flavors: ['草药', '甜', '香料'] },
  { name: '干味美思', amount: '10', unit: 'ml', flavors: ['干型', '草本'] },
  { name: '金巴利', amount: '30', unit: 'ml', flavors: ['苦味', '草本', '柑橘'] },
  { name: '阿佩罗', amount: '60', unit: 'ml', flavors: ['橙子', '微苦', '草本'] },
  { name: '君度橙酒', amount: '20', unit: 'ml', flavors: ['橙子', '柑橘', '甜'] },
  { name: '咖啡利口酒', amount: '15', unit: 'ml', flavors: ['咖啡', '焦糖', '甜'] },
  { name: '黑加仑利口酒', amount: '15', unit: 'ml', flavors: ['黑加仑', '果味', '甜'] },
  { name: '苦艾酒', amount: '5', unit: 'ml', flavors: ['茴香', '草本', '复杂'] },
  { name: '椰奶', amount: '45', unit: 'ml', flavors: ['椰子', '奶香', '热带'] },
  { name: '淡奶油', amount: '30', unit: 'ml', flavors: ['奶油', '丝滑', '甜品'] },
  { name: '蛋清', amount: '15', unit: 'ml', flavors: ['丝滑', '绵密'] }
];

// ==================== 碳酸/混合剂 ====================
export const MIXERS = [
  { name: '苏打水', amount: '适量', unit: '', flavors: ['气泡', '中性'] },
  { name: '汤力水', amount: '120', unit: 'ml', flavors: ['气泡', '微苦', '奎宁'] },
  { name: '姜汁啤酒', amount: '120', unit: 'ml', flavors: ['姜', '辛辣', '气泡'] },
  { name: '西柚苏打水', amount: '120', unit: 'ml', flavors: ['西柚', '气泡', '清爽'] },
  { name: '普罗塞克起泡酒', amount: '90', unit: 'ml', flavors: ['气泡', '果味', '干型'] }
];

// ==================== 苦精/香料 ====================
export const BITTERS_SPICES = [
  { name: '安格斯特拉苦精', amount: '3', unit: '滴', flavors: ['苦味', '香料', '复杂'] },
  { name: '佩肖苦精', amount: '4', unit: '滴', flavors: ['茴香', '苦味'] },
  { name: '薄荷叶', amount: '10', unit: '片', flavors: ['薄荷', '清凉', '草本'] },
  { name: '方糖', amount: '1', unit: '块', flavors: ['纯净甜'] }
];

// ==================== 装饰 ====================
export const GARNISHES = [
  '橙皮', '柠檬皮', '柠檬片', '柠檬轮', '青柠角', '青柠轮', '青柠壳',
  '橙片', '西柚片', '樱桃', '橄榄', '薄荷枝', '菠萝角', '覆盆子',
  '三颗咖啡豆', '芹菜杆', '热带水果', '杜松子', '盐边'
];

// ==================== 风味关键词库（用于命名） ====================
export const FLAVOR_KEYWORDS = {
  sweet: ['蜜语', '甘露', '甜梦', '糖霜', '花蜜'],
  sour: ['酸韵', '柠风', '青涩', '柑橘', '酸影'],
  bitter: ['苦旅', '暗涌', '沉思', '余韵', '回响'],
  herbal: ['草本', '绿意', '迷迭', '幽兰', '青岚'],
  smoky: ['烟熏', '余烬', '篝火', '暗夜', '灰烬'],
  spicy: ['辛辣', '烈风', '灼光', '热浪', '锋芒'],
  tropical: ['热带', '岛屿', '海浪', '落日', '椰风'],
  floral: ['花语', '蔷薇', '樱吹', '暗香', '繁花'],
  creamy: ['丝绒', '奶沫', '绵云', '柔光', '轻羽'],
  fresh: ['清风', '晨露', '薄雾', '初雪', '冰魄'],
  complex: ['交响', '层叠', '迷踪', '幻境', '变奏'],
  bold: ['狂想', '风暴', '烈焰', '雷霆', '锋芒']
};

// ==================== 风味兼容性规则 ====================
// 标记明显冲突的组合（生成时避开）
export const FLAVOR_CONFLICTS = [
  ['奶油', '青柠'],     // 奶油遇酸会凝结
  ['烟熏', '花香'],     // 烟熏会压过细腻花香
  ['薄荷', '奶油'],     // 口感冲突
  ['番茄', '椰子'],     // 风味不搭
  ['咖啡', '热带水果'], // 冲突明显
  ['茴香', '莓果']      // 冲突明显
];

// ==================== 技法库 ====================
export const METHODS = {
  shake: { label: '摇和法', emoji: '🫗', desc: '所有材料加冰放入摇酒壶，摇和至充分冷却后过滤倒入杯中' },
  stir: { label: '搅拌法', emoji: '🥄', desc: '所有材料加冰放入调酒杯，用吧勺搅拌至充分冷却后过滤倒入杯中' },
  build: { label: '直调法', emoji: '🥃', desc: '直接在饮用杯中按顺序加入材料，加冰完成' },
  blend: { label: '搅拌机法', emoji: '🌀', desc: '所有材料加冰放入搅拌机打碎混合，倒入杯中' },
  'muddle-build': { label: '捣拌直调法', emoji: '🔨', desc: '先捣压草本/水果释放风味，再按直调法加入其余材料' }
};

// ==================== 杯型库 ====================
export const GLASSES = {
  highball: '高球杯',
  rocks: '古典杯',
  coupe: '马天尼杯',
  margarita: '玛格丽特杯',
  hurricane: '飓风杯',
  collins: '柯林斯杯',
  copper: '铜杯',
  flute: '香槟杯',
  fizz: '菲士杯',
  wine: '葡萄酒杯'
};

// ==================== 颜色库（生成时根据材料推断） ====================
export function inferColor(ingredients) {
  const names = ingredients.map(i => i.name);
  if (names.some(n => n.includes('咖啡') || n.includes('金巴利') || n.includes('黑'))) return '深琥珀';
  if (names.some(n => n.includes('蔓越莓') || n.includes('石榴') || n.includes('黑加仑'))) return '粉红';
  if (names.some(n => n.includes('橙') || n.includes('菠萝') || n.includes('阿佩罗'))) return '金色';
  if (names.some(n => n.includes('薄荷') || n.includes('青柠') || n.includes('黄瓜'))) return '淡绿';
  if (names.some(n => n.includes('奶油') || n.includes('椰奶') || n.includes('蛋清'))) return '乳白';
  if (names.some(n => n.includes('番茄') || n.includes('血'))) return '深红';
  return '琥珀';
}
