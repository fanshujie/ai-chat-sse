---
doc_id: KB-00
title: 知识库目录与元数据字典
doc_type: meta
visibility: [compliance, manager]
source: 虚构教学样例
---

# 教学样例知识库 · 目录与元数据字典

> ⚠️ **本文件是目录说明，不参与向量化。** `rag/ingest.ts` 请只读取 `KB-[0-9][0-9]_*.md`（即只匹配 `KB-` 前缀），
> 或过滤掉 `doc_type: meta`。否则会把目录、`prompts.md` 模板库一起塞进知识库，污染检索结果 —— 这本身就是 D9-Q2「入库前清洗与元数据设计」的考点。

## 1. 文件清单（共 5 份，全部虚构脱敏）

| 文件 | doc_id | 主题 | 可见角色 | 主要用途 |
|---|---|---|---|---|
| `KB-01_基金销售合规话术规范.md` | KB-01 | 话术红线、禁止用语、标准场景 | sales / compliance / manager | D10 检索、D20 评测 |
| `KB-02_投资者适当性管理操作指引.md` | KB-02 | C1–C5 / R1–R5、匹配矩阵、留痕 | sales / compliance / manager | D12 等级过滤 |
| `KB-03_宣传推介材料审核要点.md` | KB-03 | 材料审核流程、业绩展示、版本失效 | **compliance / manager** | D12 角色过滤 |
| `KB-04_投资者身份识别与反洗钱操作指引.md` | KB-04 | KYC、可疑信号、私有化约束 | **compliance / manager** | D12 角色过滤、线 B 面试题 |
| `KB-05_投资者常见问题标准答复.md` | KB-05 | 20 组 Q/A + 依据 + 可见角色 | sales / compliance / manager | D10 引用、D20 评测集 |

> KB-03 / KB-04 故意设为**仅合规岗与管理者可见**，这样 D12 的「角色过滤」有真实可验证的效果：
> 以 `sales` 身份问「审计日志记什么」应检索不到 KB-04，以 `compliance` 身份问则能命中。

## 2. frontmatter 字段字典

| 字段 | 类型 | 用途 |
|---|---|---|
| `doc_id` | string | 引用展示、评测集判分、日志留痕 |
| `title` | string | 回答里的可读文档名 |
| `doc_type` | enum | `制度规范 / 操作指引 / 审核规范 / 问答库 / meta`；`meta` 不入库 |
| `visibility` | string[] | **权限过滤字段**，D12 在检索层按角色强制过滤 |
| `audience` | string | 人类可读的适用对象 |
| `version` | string | 版本追溯 |
| `effective_date` | date | 生效日；配合状态过滤，避免召回失效制度 |
| `source` | string | 标明「虚构教学样例」 |

**入库时建议追加的 chunk 级元数据**：`doc_id`、`chunk_index`、`section`（`##` 标题）、`version`、`visibility`、`effective_date`。
这样回答里可以输出「依据 KB-01 §3（v1.0）」，既满足引用要求，也方便审计。

## 3. 切分建议（D9）

- 按 `##` 先做结构切分，再按约 500 字 / overlap 50–80 字做二次切分；
- **表格不要从中间切断**（表格行跨 chunk 会让答案丢列），可将整张小表作为独立 chunk；
- `KB-05` 每条 Q/A 独立成 chunk，问答对不要合并，否则引用会串题；
- 去掉 frontmatter 后再向量化，但把字段写进 metadata。

## 4. 合规声明

本目录所有文档均为**为学习项目专门编写的虚构样例**：
不含真实客户信息、不含真实账户/证件数据、不复述具体法条号与处罚标准、不代表任何机构现行制度。
仅用于本地 RAG、权限过滤、评测集与技术面试演示，**不得用于实际业务答复或对外发布**。
