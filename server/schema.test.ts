import { validateComplianceJson } from './schema.ts'

// 3 个用例：正常 / 缺字段 / 模型用 ```json 包住但字段不对
const cases = [
  {
    name: '正常三字段',
    raw: JSON.stringify({
      合规结论: '不得承诺保本',
      依据: '资料中未说明',
      风险提示: '需补充法规依据'
    })
  },
  { name: '缺「依据」', raw: JSON.stringify({ 合规结论: '可以', 风险提示: '无' }) },
  { name: '有 JSON 包裹但字段不对', raw: '```json\n{"a":1}\n```' }
]

for (const [i, c] of cases.entries()) {
  console.log(`${i + 1}. ${c.name} →`, JSON.stringify(validateComplianceJson(c.raw)))
}
