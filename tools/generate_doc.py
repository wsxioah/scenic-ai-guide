"""Generate project documentation Word document for 灵山AI导览"""
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import datetime

doc = Document()

# ── Page setup ──
for section in doc.sections:
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)

# ── Style configuration ──
style = doc.styles['Normal']
style.font.name = '宋体'
style.font.size = Pt(11)
style.paragraph_format.line_spacing = 1.5
style.element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')

for level in range(1, 5):
    hs = doc.styles[f'Heading {level}']
    hs.font.name = '黑体'
    hs.element.rPr.rFonts.set(qn('w:eastAsia'), '黑体')
    hs.font.color.rgb = RGBColor(0x1A, 0x1A, 0x2E)
    if level == 1:
        hs.font.size = Pt(22)
    elif level == 2:
        hs.font.size = Pt(16)
    elif level == 3:
        hs.font.size = Pt(13)

def add_para(text, bold=False, size=None, align=None, indent=False):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = '宋体'
    run._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')
    if bold:
        run.bold = True
    if size:
        run.font.size = Pt(size)
    if align is not None:
        p.alignment = align
    if indent:
        p.paragraph_format.first_line_indent = Cm(0.74)
    return p

def add_table(headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers), style='Light Grid Accent 1')
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = h
        for p in cell.paragraphs:
            for r in p.runs:
                r.bold = True
                r.font.size = Pt(10)
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = table.rows[ri + 1].cells[ci]
            cell.text = str(val)
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(10)
    doc.add_paragraph()

def add_bullet(text):
    p = doc.add_paragraph(text, style='List Bullet')
    for r in p.runs:
        r.font.name = '宋体'
        r._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')
        r.font.size = Pt(11)

# ═══════════════════════════════════════════════════════════
# COVER PAGE
# ═══════════════════════════════════════════════════════════
doc.add_paragraph()
doc.add_paragraph()
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run('灵山胜境 AI 数字人导览系统')
run.font.size = Pt(28)
run.bold = True
run.font.name = '黑体'
run._element.rPr.rFonts.set(qn('w:eastAsia'), '黑体')
run.font.color.rgb = RGBColor(0x8B, 0x5E, 0x2B)

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = subtitle.add_run('作品说明文档')
run.font.size = Pt(18)
run.font.name = '黑体'
run._element.rPr.rFonts.set(qn('w:eastAsia'), '黑体')
run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

doc.add_paragraph()
doc.add_paragraph()

info_lines = [
    f'文档版本：v1.0',
    f'编制日期：{datetime.date.today().strftime("%Y年%m月%d日")}',
    '技术栈：FastAPI + React Native (Expo) + Vue 3 + Ant Design',
    '目标平台：Android 9+ 手机',
]
for line in info_lines:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(line)
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)

doc.add_page_break()

# ═══════════════════════════════════════════════════════════
# TABLE OF CONTENTS (manual)
# ═══════════════════════════════════════════════════════════
doc.add_heading('目  录', level=1)
toc_items = [
    '一、需求分析',
    '    1.1 项目背景',
    '    1.2 目标用户',
    '    1.3 核心痛点',
    '    1.4 功能需求',
    '二、功能架构',
    '    2.1 系统总体架构',
    '    2.2 移动端功能模块',
    '    2.3 管理后台功能模块',
    '    2.4 后端服务模块',
    '三、技术选型',
    '    3.1 技术栈总览',
    '    3.2 关键技术选型理由',
    '四、实现方案',
    '    4.1 AI 智能导览对话',
    '    4.2 数字人形象与语音合成',
    '    4.3 景区地图与定位导航',
    '    4.4 个性化推荐引擎',
    '    4.5 拍照识景',
    '    4.6 用户认证与数据持久化',
    '    4.7 管理后台数据看板',
    '五、创新点',
    '六、测试情况',
    '七、团队分工',
]
for item in toc_items:
    p = doc.add_paragraph()
    run = p.add_run(item)
    run.font.size = Pt(11)
    if not item.startswith('    '):
        run.bold = True
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.space_before = Pt(2)

doc.add_page_break()

# ═══════════════════════════════════════════════════════════
# 一、需求分析
# ═══════════════════════════════════════════════════════════
doc.add_heading('一、需求分析', level=1)

doc.add_heading('1.1 项目背景', level=2)
add_para('灵山胜境是国家 5A 级旅游景区，位于江苏省无锡市，以佛教文化为核心，集自然风光、人文景观、宗教体验于一体，年接待游客超百万人次。景区占地面积广阔，景点分布较为分散，传统的人工导览和固定标识牌难以满足游客个性化、即时性的信息获取需求。', indent=True)
add_para('随着大语言模型（LLM）、语音合成（TTS）、语音识别（ASR）和实时渲染技术的成熟，AI 驱动的数字人导览成为提升游客体验的有效手段。本项目旨在为灵山胜境景区构建一套完整的 AI 数字人导览系统，覆盖游客端移动 App、管理后台和 AI 后端服务三端，提供从出行前规划到游中导航到游后分享的全链路服务。', indent=True)

doc.add_heading('1.2 目标用户', level=2)
add_para('本系统的目标用户分为两类：', indent=True)
add_bullet('游客用户：前往灵山胜境景区的游客，通过手机 App 获取 AI 导览、地图导航、景点介绍、语音对话等服务。')
add_bullet('景区管理人员：通过 Web 管理后台进行知识库维护、公告发布、数据看板监控、数字人配置、FAQ 管理等运营工作。')

doc.add_heading('1.3 核心痛点', level=2)
pain_points = [
    ('信息获取不便', '游客在景区内难以快速获取准确的景点介绍、历史典故、设施位置等信息，传统语音讲解器内容固定、缺乏交互。'),
    ('导览体验单一', '传统导览无法根据游客偏好、位置和实时需求提供个性化服务，"千人一面"的讲解无法满足差异化需求。'),
    ('景区运营缺乏数据支撑', '管理人员难以掌握游客行为偏好、热门景点分布、对话高频问题等数据，运营决策缺乏量化依据。'),
    ('紧急信息传达低效', '景区公告、紧急通知等信息缺乏高效的数字化传达渠道，依赖人工喊话或纸质张贴。'),
]
for title, desc in pain_points:
    add_bullet(f'{title}：{desc}')

doc.add_heading('1.4 功能需求', level=2)
add_para('基于上述痛点分析，系统需实现以下核心功能：', indent=True)

func_reqs = [
    ['需求编号', '功能模块', '需求描述', '对应端'],
    ['FR-01', 'AI 智能对话', '游客可通过文字或语音与 AI 数字人进行多轮对话，获取景点讲解、路线推荐、设施查询等服务', '移动端 + 后端'],
    ['FR-02', 'Live2D 数字人', '对话界面展示 Live2D 数字人形象（支持男女切换），口型随语音同步，增强交互沉浸感', '移动端'],
    ['FR-03', '实时语音交互', '支持语音输入（ASR 识别）和语音输出（TTS 合成），实现端到端语音对话', '移动端 + 后端'],
    ['FR-04', '景区地图导航', '集成百度地图，显示景点和设施 POI 标记，支持 GPS 定位、步行路线规划、景点搜索', '移动端'],
    ['FR-05', '景点浏览与详情', '列表和地图双模式浏览景点，详情页展示图文介绍、用户评论、周边景点', '移动端 + 后端'],
    ['FR-06', '个性化推荐', '基于用户浏览历史、对话内容和协同过滤算法，推荐用户可能感兴趣的景点', '移动端 + 后端'],
    ['FR-07', '拍照识景', '拍摄景点照片，通过深度学习模型识别景点名称并跳转详情页', '移动端 + 后端'],
    ['FR-08', '收藏与历史', '用户可收藏景点、查看浏览历史，个人主页展示访问统计', '移动端 + 后端'],
    ['FR-09', '社区评论', '用户可对景点进行评分和评论，支持回复和点赞', '移动端 + 后端'],
    ['FR-10', '账号系统', '支持账号密码注册/登录，JWT Token 持久化，Token 过期自动跳转登录页', '移动端 + 后端'],
    ['FR-11', '景区公告', '管理后台发布公告（普通/紧急），移动端首页弹窗展示', '全端'],
    ['FR-12', '知识库管理', '管理后台维护景点知识库，支持 Excel 批量导入和 ChromaDB 向量检索', '管理后台 + 后端'],
    ['FR-13', '数据看板', '管理后台展示核心运营指标（用户数、对话量、热门景点、游客画像等）可视化图表', '管理后台 + 后端'],
    ['FR-14', '数字人配置', '管理后台可配置数字人模型、语音类型、开场白等参数', '管理后台 + 后端'],
    ['FR-15', 'FAQ 管理', '管理后台维护常见问题，App 端公开查询', '全端'],
    ['FR-16', 'POI 设施管理', '管理后台维护厕所、餐饮、停车场等设施 POI 数据，地图端展示和导航', '管理后台 + 后端 + 移动端'],
]
add_table(func_reqs[0], func_reqs[1:])

doc.add_page_break()

# ═══════════════════════════════════════════════════════════
# 二、功能架构
# ═══════════════════════════════════════════════════════════
doc.add_heading('二、功能架构', level=1)

doc.add_heading('2.1 系统总体架构', level=2)
add_para('系统采用三端分离架构：后端服务（FastAPI）提供 RESTful API 和 WebSocket 实时通信；移动端（React Native + Expo）面向游客提供 AI 导览交互；管理后台（Vue 3 + Ant Design）面向景区运营人员提供数据管理和配置功能。三端通过 HTTP/WebSocket 协议通信，数据存储采用 SQLite 数据库和 ChromaDB 向量数据库。', indent=True)

add_para('系统架构层次：', bold=True)
add_bullet('展示层：React Native App（移动端）+ Vue 3 SPA（管理后台）')
add_bullet('通信层：RESTful API（HTTP）+ WebSocket（实时双向通信）')
add_bullet('业务层：FastAPI 路由 + 服务层（LLM、RAG、TTS、ASR、推荐、识别）')
add_bullet('数据层：SQLite（关系型）+ ChromaDB（向量存储）+ 文件系统（TTS 音频缓存、Live2D 模型）')
add_bullet('AI 模型层：DeepSeek（云端 LLM）+ Whisper Small（本地 ASR）+ BGE（本地 Embedding）+ EfficientNet-B3（本地图像识别）+ Edge TTS（云端语音合成）')

doc.add_heading('2.2 移动端功能模块', level=2)
add_para('移动端基于 Expo SDK 56 构建，包含 5 个底部导航 Tab 和 8 个核心页面：', indent=True)

mobile_modules = [
    ['Tab / 页面', '功能说明', '核心组件'],
    ['首页 (Home)', '景区轮播图、快捷功能入口（公告、热门景点、搜索）、推荐景点', 'HomeScreen, BroadcastBanner'],
    ['AI 导览 (Chat)', 'Live2D 数字人对话界面，支持文字/语音输入，WebSocket 实时流式回复，语音合成播放', 'ChatScreen, AvatarWebView, VoiceRecordButton'],
    ['地图 (Map)', '百度地图 WebGL 展示，景点/设施 POI 标记，GPS 实时定位，步行路线规划，设施分类筛选', 'MapScreen + 内嵌 WebView'],
    ['景点 (Scenic)', '景点列表浏览（支持搜索和分类筛选），点击进入详情页', 'ScenicListScreen, ScenicDetailScreen'],
    ['我的 (Profile)', '用户信息、访问统计、收藏列表、浏览历史、账号登录/注册', 'ProfileScreen'],
    ['搜索 (Search)', '全局景点搜索，实时关键词匹配', 'SearchScreen'],
    ['社区 (Community)', '景点评论列表，评分和评论发表', 'CommunityScreen'],
    ['拍照识景', '调用相机拍摄景点照片，上传后端识别', 'RecognizeModal（集成在 ChatScreen）'],
]
add_table(mobile_modules[0], mobile_modules[1:])

doc.add_heading('2.3 管理后台功能模块', level=2)
add_para('管理后台基于 Vue 3 + Ant Design Vue 构建，包含 7 个功能页面：', indent=True)

admin_modules = [
    ['页面', '路由', '功能说明'],
    ['仪表盘', '/dashboard', '展示核心运营指标：用户总数、对话统计、热门景点 Top 10、游客性别/年龄分布、消费分析、游客行为偏好等 ECharts 可视化图表'],
    ['知识库管理', '/knowledge', '景点知识条目的增删改查、Excel 批量导入、按景点分类筛选、与 ChromaDB 向量库同步'],
    ['用户管理', '/users', '用户列表查看、搜索、详情查看'],
    ['对话统计', '/conversations', '对话记录列表查看、按用户筛选、消息详情查看'],
    ['数字人配置', '/digital-human', '配置数字人模型类型（Live2D）、语音类型、语速/音调、开场白'],
    ['公告管理', '/announcements', '公告增删改查，支持普通/紧急类型标记，控制前端弹窗展示'],
    ['FAQ 管理', '/faqs', '常见问题的增删改查，支持分类管理和发布状态控制'],
]
add_table(admin_modules[0], admin_modules[1:])

doc.add_heading('2.4 后端服务模块', level=2)
add_para('后端基于 FastAPI 框架，共 10 个 API 路由模块和 6 个服务模块：', indent=True)

backend_modules = [
    ['路由模块', '前缀', '主要端点', '功能说明'],
    ['auth', '/api/auth', 'login, register, profile, stats', '用户认证（JWT）、注册、个人信息、统计数据'],
    ['chat', '/api/chat', 'history, messages/{id}', '对话历史查询、消息记录'],
    ['digital_human', '/ws', 'WebSocket /ws', 'WebSocket 实时对话：流式 LLM 推理 + 句子级 TTS 合成 + 音频推送'],
    ['voice', '/api/voice', 'tts, recognize', '语音合成（Edge TTS）、语音识别（Whisper ASR）'],
    ['scenic', '/api/scenic', 'spots, spots/{id}, nearby, comments, announcements', '景点 CRUD、附近景点、评论、公告'],
    ['knowledge', '/api/knowledge', 'points, import, search', '知识条目管理、Excel 导入、向量搜索'],
    ['admin', '/api/admin', 'dashboard_full, faqs CRUD, digital-human/config, poi CRUD', '管理后台仪表盘数据、FAQ 管理、数字人配置、POI 管理'],
    ['poi', '/api/poi', 'nearby, search', 'POI 设施附近查询和搜索'],
    ['recommend', '/api/recommend', 'for-user, track/view, track/favorite, track/favorites', '个性化推荐、浏览追踪、收藏管理'],
    ['recognition', '/api/recognition', 'identify', '图片景物识别（EfficientNet-B3）'],
]
add_table(backend_modules[0], backend_modules[1:])

doc.add_page_break()

# ═══════════════════════════════════════════════════════════
# 三、技术选型
# ═══════════════════════════════════════════════════════════
doc.add_heading('三、技术选型', level=1)

doc.add_heading('3.1 技术栈总览', level=2)

tech_stack = [
    ['层次', '技术', '版本/型号', '用途'],
    ['后端框架', 'Python FastAPI', '0.115+', 'RESTful API + WebSocket 服务'],
    ['数据库', 'SQLite (aiosqlite)', '3.x', '关系型数据存储（用户、景点、对话等）'],
    ['向量数据库', 'ChromaDB', '0.5+', '知识库语义检索（RAG）'],
    ['大语言模型', 'DeepSeek Chat', 'deepseek-chat', 'AI 对话推理生成'],
    ['Embedding', 'BGE (BAAI/bge-small-zh)', 'v1.5', '中文文本向量化'],
    ['语音识别', 'OpenAI Whisper', 'Small (769MB)', '中文语音转文字'],
    ['语音合成', 'Microsoft Edge TTS', 'zh-CN-XiaoxiaoNeural', '文字转语音（自然度高）'],
    ['图像识别', 'EfficientNet-B3', 'PyTorch', '灵山 12 类景点图片识别'],
    ['移动端', 'React Native + Expo', 'SDK 56 / RN 0.85', '跨平台移动 App 开发'],
    ['状态管理', 'Zustand', '5.x', '移动端轻量级状态管理'],
    ['导航', 'React Navigation', '7.x', '移动端 Tab + Stack 导航'],
    ['地图', '百度地图 JavaScript API GL', '1.0', '景区地图渲染与 POI 展示'],
    ['音频', 'expo-audio', '56.x', '移动端 TTS 音频播放队列'],
    ['语音输入', 'expo-speech-recognition', '56.x', '移动端语音录制与识别'],
    ['WebView', 'react-native-webview', '13.x', 'Live2D 数字人和百度地图渲染容器'],
    ['管理前端', 'Vue 3 + Vite', '3.x / 6.x', '管理后台 SPA 框架'],
    ['UI 组件库', 'Ant Design Vue', '4.x', '管理后台 UI 组件'],
    ['图表', 'ECharts', '5.x', '管理后台数据可视化'],
    ['数字人', 'Live2D Cubism 4 SDK', '4.x', '2D 数字人模型渲染 + 口型驱动'],
    ['部署', 'Python + Node.js', '-', '后端 :8000 / 管理后台 :5173 / Expo :8081'],
]
add_table(tech_stack[0], tech_stack[1:])

doc.add_heading('3.2 关键技术选型理由', level=2)

selections = [
    ('FastAPI + WebSocket', '相较于 Flask + Socket.IO 方案，FastAPI 原生支持异步 WebSocket，与 asyncio 生态无缝集成。在数字人实时对话场景中，WebSocket 承载 LLM 流式推理 + 句子级 TTS 合成的双向数据流，FastAPI 的异步特性保证了单连接内的低延迟和高吞吐。'),
    ('DeepSeek Chat（云端 LLM）', 'DeepSeek 提供高性价比的中文大模型 API，中文理解能力强，支持流式输出（SSE），适合景区知识问答场景。服务层抽象了 LLM Provider 接口，可灵活切换为通义千问、豆包等国产模型。'),
    ('Whisper Small（本地 ASR）', '相较于云端 ASR API，本地部署 Whisper Small 模型消除了网络延迟和 API 调用费用。Small 型号在中文识别准确率和推理速度间取得平衡（模型 769MB，首次加载 3-15 秒，后续推理约 2-5 秒/条）。系统在启动时预加载模型，避免首请求等待。'),
    ('Edge TTS（云端语音合成）', 'Microsoft Edge TTS 提供免费、高自然度的中文语音合成（神经网络 TTS），支持多种音色。相较于 VITS/GPT-SoVITS 等本地方案，Edge TTS 无需 GPU 资源，部署简单，音色自然度业界领先。'),
    ('ChromaDB + BGE Embedding（RAG）', 'ChromaDB 为轻量级向量数据库，支持本地持久化，无需额外部署服务。BGE (BAAI/bge-small-zh) 是中文语义检索领域表现最优的小型 Embedding 模型之一。RAG（检索增强生成）技术让 AI 回复基于景区真实知识库，有效减少幻觉。'),
    ('百度地图 JavaScript API GL', '百度地图在国内的 POI 数据覆盖、定位精度和路径规划能力优于 Google Maps 和 MapLibre。系统使用 WebGL 版本支持 3D 倾斜视角，通过 BD09 坐标体系与实地采集的景点/设施坐标对齐。同时内置百度 Geolocation 作为辅助定位源（适用于无 Google Play 服务的国产手机）。'),
    ('React Native + Expo', 'Expo 托管开发流程简化了原生模块（相机、定位、音频、语音识别）的集成，SDK 56 版本对 react-native 0.85 有完整支持。一套 TypeScript 代码运行于 Android 平台，开发效率高。'),
    ('EfficientNet-B3（拍照识景）', '相较于 ResNet/ViT 等模型，EfficientNet-B3 在模型大小（~50MB）和识别准确率间有最优权衡。针对灵山 12 类景点（大佛、九龙灌浴、梵宫等）进行微调训练，Top-1 准确率满足景区场景识别需求。'),
    ('Live2D Cubism 4', '相较于 3D VRM 模型，Live2D 2D 模型的渲染性能需求低，在移动端 WebView 中可流畅运行（PIXI.js + WebGL）。口型参数通过 requestAnimationFrame 驱动的正弦波振荡实现，支持模型切换（haru 女性/Chitose 男性）。'),
]
for title, reason in selections:
    add_bullet(f'{title}：{reason}')

doc.add_page_break()

# ═══════════════════════════════════════════════════════════
# 四、实现方案
# ═══════════════════════════════════════════════════════════
doc.add_heading('四、实现方案', level=1)

# 4.1 AI 智能导览对话
doc.add_heading('4.1 AI 智能导览对话', level=2)
add_para('AI 智能导览对话是本系统的核心功能，实现了多轮上下文感知的景区知识问答。技术实现采用"WebSocket 流式传输 + RAG 检索增强 + 句子级 TTS 合成流水线"架构。', indent=True)

add_para('技术流程：', bold=True)
steps = [
    '移动端通过 WebSocket 连接后端 ws://host:8000/ws，发送用户消息（文字或语音识别结果）；',
    '后端 digital_human.py WebSocket 处理器接收消息，调用 LLM 服务（DeepSeek Chat）发起流式推理请求；',
    '每条消息携带最近 10 轮历史对话上下文，同时对用户问题在 ChromaDB 知识库中执行语义检索，Top-5 相关知识片段注入 LLM 提示词；',
    'LLM 流式返回 token 序列，后端通过正则匹配识别句子边界（句号、问号、感叹号、换行），每完成一个完整句子立即调用 Edge TTS 合成语音；',
    'TTS 合成的 MP3 音频块通过 WebSocket 推送到移动端，附带对应的文字片段和音频序号（seq），移动端按序加入播放队列；',
    '移动端使用 expo-audio 按 seq 顺序播放音频，同时向 Live2D WebView 发送 lipSync/idle 指令控制口型动画。',
]
for i, step in enumerate(steps, 1):
    add_bullet(f'第 {i} 步：{step}')

add_para('关键优化：', bold=True)
add_bullet('句子级流水线：不等 LLM 完整回复，每完成一个句子即合成播放，显著降低首字延迟（从 15-30 秒降至 2-5 秒）。')
add_bullet('模型预加载：服务启动时预加载 Whisper ASR 模型（769MB）、ChromaDB 向量库和 Embedding 模型、LLM HTTP 客户端（预热 DNS+TCP+TLS 连接），避免首请求冷启动延迟。')
add_bullet('对话上下文记忆：每次对话保存到 Conversation 和 Message 表，下次对话时携带最近 10 轮历史，实现上下文感知的多轮对话。')

# 4.2 数字人形象与语音合成
doc.add_heading('4.2 数字人形象与语音合成', level=2)
add_para('系统集成了 Live2D Cubism 4 数字人渲染引擎，通过 WebView 嵌入在 AI 导览页面中，提供可视化的 AI 助手形象。', indent=True)

add_para('技术实现：', bold=True)
add_bullet('Live2D 渲染：使用 PIXI.js + cubism4.js 在 WebGL Canvas 上渲染 Live2D 模型。模型文件存储在 static/digital-human/live2d/ 目录。')
add_bullet('双模型支持：haru_greeter_t03（女性角色）和 chitose（男性角色），通过 URL 参数 ?model=male 切换，移动端 ChatScreen 提供男女切换 UI。')
add_bullet('口型同步：移动端在音频开始播放时发送 lipSync 指令，音频结束或队列清空时发送 idle 指令。WebView 内部使用 requestAnimationFrame 驱动正弦波振荡（基础频率 4.5Hz，叠加 8Hz 谐波和 1.5Hz 包络），驱动 Live2D 模型的 ParamMouthOpenY 参数。')
add_bullet('音频播放：使用 expo-audio 实现播放队列管理，按 seq 顺序播放，支持中断和新消息抢占。')
add_bullet('模型自适应缩放：根据 WebView 容器尺寸动态计算模型缩放比例和位置，窗口 resize 时自动重适配。')

# 4.3 景区地图与定位导航
doc.add_heading('4.3 景区地图与定位导航', level=2)
add_para('地图模块采用百度地图 JavaScript API GL（WebGL 3D 渲染），通过 WebView 嵌入移动端 MapScreen。地图数据基于实地采集的 BD09 坐标系。', indent=True)

add_para('技术实现：', bold=True)
add_bullet('坐标体系：所有景点和设施坐标使用 BD09 坐标系（现场使用百度地图 App 采集）。GPS 定位返回 WGS84 坐标，通过 wgs84ToBd09() 算法在 HTML 端自动转换。')
add_bullet('数据规模：61 个景点坐标、13 个厕所坐标，以及出入口、停车场、餐饮、服务中心等设施坐标。完整坐标记录在 tools/collected_coords.md。')
add_bullet('地图标记：景点使用紫色 Pin 标记，不同设施类型使用不同颜色（蓝色出入口、粉色厕所、黄色停车场、绿色服务、橙色餐饮）。')
add_bullet('GPS 定位：双源定位策略——优先使用百度 Geolocation（适用于无 Google Play 的国产手机），备选 React Native expo-location。定位结果实时显示在地图上（蓝色圆点）。')
add_bullet('步行路线规划：调用百度 WalkingRoute API，从用户当前位置到目标景点规划步行路线并绘制在地图上。')
add_bullet('设施筛选：地图页底部提供设施分类筛选栏（全部/厕所/餐饮/停车/服务/入口），点击切换显示对应类型 POI 标记。')
add_bullet('地图交互：支持 3D 倾斜视角（45° 默认）、缩放、拖拽，点击 POI 标记弹出信息窗口，点击景点标记跳转详情页。')

# 4.4 个性化推荐引擎
doc.add_heading('4.4 个性化推荐引擎', level=2)
add_para('推荐引擎综合用户浏览行为、对话内容、收藏记录和协同过滤信号，为每位用户生成个性化景点推荐列表。', indent=True)

add_para('推荐策略：', bold=True)
add_bullet('内容信号：解析用户最近 20 条对话内容，提取景点关键词，匹配 scenic_spots 表中的景点名称。同时读取 user.visit_history JSON 获取浏览记录。')
add_bullet('协同过滤：基于 140K 条 TouristBehavior 数据，找到与当前用户行为相似的其他游客群体，推荐该群体高频访问但当前用户未浏览的景点。')
add_bullet('热度兜底：当个性化信号不足（冷启动用户或推荐结果不足 limit 数量）时，用热门景点（按 PV 排序）补齐推荐列表，自动排除已浏览景点。')
add_bullet('数据过滤：140K 条游客行为数据中仅保留灵山景区相关景点（共 40 个灵山景点），过滤掉无关的外地景点数据。')
add_bullet('API 端点：GET /api/recommend/for-user 返回个性化推荐列表；POST /recommend/track/view 记录浏览行为；POST /recommend/track/favorite 切换收藏状态。')

# 4.5 拍照识景
doc.add_heading('4.5 拍照识景', level=2)
add_para('拍照识景功能基于 EfficientNet-B3 卷积神经网络，在移动端拍摄景点照片后上传后端识别，返回 Top-5 预测结果。', indent=True)

add_para('技术实现：', bold=True)
add_bullet('模型：EfficientNet-B3，输入尺寸 256×256，12 类灵山景点分类（灵山大佛、九龙灌浴、梵宫、五印坛城等）。')
add_bullet('推理流程：移动端调用 expo-image-picker 拍摄照片 → 读取为 base64 → POST /api/recognition/identify → 后端加载 PyTorch 模型 → Softmax 推理 → 返回 Top-5 景点名称和置信度。')
add_bullet('模型托管：best_model.pth（129MB）和 class_labels.json 存储在后端 models/recognition/ 目录，首次请求时加载到内存。')
add_bullet('集成位置：拍照按钮集成在 ChatScreen 的输入工具栏中，识别结果以 RecognizeModal 弹窗展示，用户可选择跳转到对应景点详情页。')

# 4.6 用户认证与数据持久化
doc.add_heading('4.6 用户认证与数据持久化', level=2)
add_para('系统实现了完整的账号密码认证体系和客户端数据持久化方案。', indent=True)

add_para('技术实现：', bold=True)
add_bullet('账号注册/登录：支持账号（至少 3 位）+ 密码（至少 6 位，需含字母和数字）注册，密码使用 passlib bcrypt 哈希存储。')
add_bullet('JWT Token：HS256 算法签发，有效期 7 天。登录成功后 Token 返回客户端，后续请求通过 Authorization: Bearer 头携带。')
add_bullet('Token 持久化：移动端使用 expo-secure-store（Android Keystore 加密存储）保存 Token，App 启动时通过 restoreAuth() 自动恢复登录态。')
add_bullet('Token 过期处理：ApiClient.request() 拦截 401 响应，调用 onUnauthorized 回调，自动清除 Token 并跳转登录页。')
add_bullet('登录频率限制：后端 auth.py 对 /login 端点实施 1 分钟内最多 5 次尝试的限制，超过阈值返回 429 Too Many Requests。')
add_bullet('路由守卫：管理后台 router.beforeEach 校验 Token 有效性，未登录跳转 /login 页面，已登录访问 /login 自动重定向到 /dashboard。')

# 4.7 管理后台数据看板
doc.add_heading('4.7 管理后台数据看板', level=2)
add_para('管理后台仪表盘通过后端 /api/admin/dashboard_full 端点返回 10 个统计模块的聚合数据，前端使用 ECharts 渲染可视化图表。', indent=True)

add_para('统计模块：', bold=True)
add_bullet('概览统计：用户总数、对话总数、景点总数、知识条目数')
add_bullet('景点热度排行：按浏览量排序的 Top 10 景点')
add_bullet('用户性别分布：饼图')
add_bullet('用户年龄分布：柱状图（按年龄段分组）')
add_bullet('游客消费分析：门票、餐饮、购物、交通、娱乐消费分布')
add_bullet('游客满意度分布：1-5 分满意度统计')
add_bullet('出行人数分布：单人到多人团体分布')
add_bullet('景点类型分布：自然/人文/历史等分类统计')
add_bullet('近期对话趋势：按日期统计对话量')
add_bullet('游客行为偏好：景点类型偏好排行（基于 140K 行为数据）')
add_para('后端每个统计模块独立 try/except 包裹，单个模块查询失败不影响其他模块数据返回，保证仪表盘的容错性。', indent=True)

doc.add_page_break()

# ═══════════════════════════════════════════════════════════
# 五、创新点
# ═══════════════════════════════════════════════════════════
doc.add_heading('五、创新点', level=1)

innovations = [
    ('句子级流式 TTS 流水线',
     '传统 AI 对话采用"LLM 完整回复 → 整段 TTS"方案，用户需等待 15-30 秒才能听到语音回复。'
     '本系统创新性地实现了"句子级分割 + 流水线并行"架构：LLM 每生成一个完整句子立即触发 TTS 合成和音频推送，'
     '移动端按序播放。首句语音延迟从 15-30 秒降至 2-5 秒，大幅提升交互实时感。'),
    ('WebSocket 三合一数据通道',
     'WebSocket 连接同时承载三路数据流：(1) 上行用户消息 (2) 下行 LLM token 文字流 (3) 下行 TTS 音频块流。'
     '单连接复用减少了移动端的网络开销和连接管理复杂度，音频块附带 seq 序号保证乱序场景下的正确播放顺序。'),
    ('Live2D 口型动画无音频驱动方案',
     '传统数字人口型依赖 Web Audio API 的 AnalyserNode 实时分析音频频谱。在 React Native WebView 环境中，'
     '音频由 expo-audio 原生播放，无法直接接入 Web Audio 分析。本系统采用"移动端指令驱动 + WebView 正弦波振荡"方案：'
     '移动端在音频播放期间持续发送 lipSync 指令（200ms 间隔），WebView 内部用 requestAnimationFrame 生成自然的口型波动，'
     '不依赖音频信号本身，跨平台兼容性更好。'),
    ('双源 GPS 坐标自适应转换',
     '景区数据采集使用百度地图 BD09 坐标，手机 GPS 返回 WGS84 坐标，百度 Geolocation 返回 BD09 坐标。'
     '系统在 HTML 地图层自动识别坐标来源并选择性转换（GPS WGS84 → BD09，百度定位直接使用），'
     '避免重复转换导致的 ~500m 偏移。同时将用户定位源标记为 ref，确保步行导航使用正确的起始坐标。'),
    ('多模态景区识别与知识检索融合（RAG + CNN）',
     '系统融合两种 AI 识别方式：(1) 文本层面，通过 ChromaDB 向量检索从 22 个结构化景点知识条目中匹配最相关内容注入 LLM 提示；'
     '(2) 视觉层面，通过 EfficientNet-B3 卷积网络识别游客拍摄的景点照片。两种 AI 能力在对话界面统一呈现，'
     '游客可通过语音、文字或拍照三种方式获取景点信息。'),
    ('140K 行为数据驱动的协同过滤推荐',
     '利用赛方提供的 140K 条游客行为分析数据，构建用户行为画像和景点关联网络。推荐引擎整合内容分析（对话关键词匹配）、'
     '协同过滤（相似游客群体偏好）和热度兜底三道策略，冷启动用户也能获得有效的景点推荐。'
     '数据经严格过滤（仅保留灵山 40 个相关景点），避免推荐无关内容。'),
    ('服务启动模型预加载',
     '系统在 FastAPI lifespan 事件中预加载三个重量级模型：(1) Whisper Small ASR 模型（769MB）'
     '(2) ChromaDB + BGE Embedding 模型（471MB）(3) LLM HTTP 客户端连接池。'
     '避免传统"首次请求触发加载"模式导致的 8-30 秒冷启动延迟，所有请求响应时间稳定在可预期范围内。'),
    ('管理后台"容错分区"设计',
     '仪表盘 /api/admin/dashboard_full 包含 10 个统计模块，每个模块独立 try/except 包裹。'
     '单一数据表查询失败（如 TouristBehavior 表异常）不影响其他 9 个模块的数据返回，'
     '前端以 a-alert 警告提示替代白屏崩溃，保证运营监控的持续可用性。'),
]

for title, detail in innovations:
    add_para(f'{innovations.index((title, detail)) + 1}. {title}', bold=True)
    add_para(detail, indent=True)

doc.add_page_break()

# ═══════════════════════════════════════════════════════════
# 六、测试情况
# ═══════════════════════════════════════════════════════════
doc.add_heading('六、测试情况', level=1)

doc.add_heading('6.1 测试策略', level=2)
add_para('本项目采用分层测试策略，覆盖后端 API、前端 UI 和端到端集成三个层面。测试以手动功能验证为主，辅以自动化 API 测试脚本。', indent=True)

doc.add_heading('6.2 后端 API 测试', level=2)
add_para('对全部 10 个 API 路由模块的 40+ 个端点进行了端到端功能验证，测试覆盖：', indent=True)
add_bullet('认证模块：登录/注册流程、Token 签发与验证、过期 Token 拒绝、密码强度校验、登录频率限制')
add_bullet('对话模块：WebSocket 连接建立/断开、消息收发、对话历史和消息记录查询')
add_bullet('景点模块：景点列表分页/搜索/筛选、详情查询、附近景点计算')
add_bullet('推荐模块：个性化推荐生成、浏览追踪写入、收藏切换、收藏列表查询')
add_bullet('语音模块：TTS 合成（Edge TTS）、语音识别（Whisper ASR）')
add_bullet('POI 模块：附近设施查询、按分类筛选')
add_bullet('管理后台：仪表盘数据聚合（10 模块容错验证）、FAQ CRUD、公告管理、知识库导入、数字人配置保存')
add_bullet('系统级：/health 健康检查、全局异常处理、CORS 跨域配置')

doc.add_heading('6.3 移动端功能测试', level=2)
add_para('在真机 Android 设备上进行了以下功能验证：', indent=True)
add_bullet('App 启动/闪屏 → 首页加载正常')
add_bullet('账号注册 → 登录 → Token 持久化 → 退出登录 → 重新登录全流程')
add_bullet('AI 导览对话：文字输入 → WebSocket 连接 → 流式文字回复 → TTS 音频播放 → Live2D 口型同步')
add_bullet('语音输入：按钮录音 → ASR 识别 → 自动发送 → AI 回复')
add_bullet('地图模块：GPS 定位、景点/设施标记渲染、步行路线规划、设施分类筛选')
add_bullet('景点浏览：列表滚动、搜索筛选、详情页展示、评论查看')
add_bullet('拍照识景：相机调用 → 照片上传 → 识别结果展示 → 跳转详情')
add_bullet('收藏/浏览历史：收藏景点 → 列表展示 → 点击跳转详情')
add_bullet('推荐芯片：AI 对话结束后推荐景点展示 → 点击跳转')

doc.add_heading('6.4 管理后台功能测试', level=2)
add_para('在桌面浏览器（Chrome/Edge）中验证了所有管理后台页面的功能：', indent=True)
add_bullet('登录/登出/路由守卫（未登录拦截、已登录自动跳转）')
add_bullet('仪表盘 10 个统计模块数据正确性和断 DB 后的容错展示')
add_bullet('知识库 CRUD + Excel 导入 + 分类筛选')
add_bullet('用户列表/对话记录列表查看')
add_bullet('公告发布/编辑/删除 + 活跃状态切换')
add_bullet('FAQ 管理全流程 CRUD')
add_bullet('数字人配置保存和生效')

doc.add_heading('6.5 已知问题与限制', level=2)
add_bullet('Whisper Small 模型在无 GPU 环境下推理耗时 2-5 秒/条，长语音录制的识别等待时间较长。')
add_bullet('DeepSeek 目前不支持多模态图像理解，拍照识景仅通过专用 CNN 模型识别景点类别，无法理解照片中的文字或复杂场景。')
add_bullet('当前仅适配 Android 平台，iOS 平台需要额外配置 Live2D Cubism SDK 和百度地图 SDK。')
add_bullet('使用百度地图 JavaScript API 需要有效的网络连接，离线场景下地图功能不可用。')

doc.add_page_break()

# ═══════════════════════════════════════════════════════════
# 七、团队分工
# ═══════════════════════════════════════════════════════════
doc.add_heading('七、团队分工', level=1)

add_para('本项目由团队协作完成，各成员分工如下：', indent=True)

team_roles = [
    ['角色', '职责范围', '主要工作内容'],
    ['后端开发', 'FastAPI 后端服务', 'API 路由设计与实现、数据库模型设计、WebSocket 实时通信、LLM/RAG/TTS/ASR 服务集成、'
     '推荐引擎算法实现、拍照识景模型部署、管理后台数据 API、全局异常处理与安全加固'],
    ['移动端开发', 'React Native App', '页面 UI 开发（8 个页面）、导航架构设计（Tab + Stack）、WebSocket 客户端集成、'
     'Live2D WebView 集成与口型同步、expo-audio 音频播放队列、百度地图 WebView 集成、'
     'GPS 定位与坐标转换、语音输入/输出、Token 持久化与登录流程、灵山禅意主题设计'],
    ['前端开发', 'Vue 3 管理后台', '页面 UI 开发（7 个页面）、路由与导航守卫、ECharts 数据可视化仪表盘、'
     '知识库管理界面与 Excel 导入、FAQ CRUD 页面、数字人配置表单、禅意金色系主题定制'],
    ['数据工程', '景区数据采集与导入', '景点/设施坐标实地采集（BD09 坐标系，61 景点 + 13 厕所 + 其他设施）、'
     '22 个结构化景点知识条目编写、3 条游览路线设计、140K 游客行为数据清洗与导入、'
     '知识库 Excel 编制与 ChromaDB 向量化导入'],
    ['项目管理/测试', '测试与文档', '端到端功能测试、Bug 追踪与修复验证、API 接口测试、真机兼容性测试、技术文档编写'],
]
add_table(team_roles[0], team_roles[1:])

# ── Footer ──
doc.add_paragraph()
doc.add_paragraph()
footer = doc.add_paragraph()
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = footer.add_run('— 灵山胜境 AI 数字人导览系统 作品说明文档 · 完 —')
run.font.size = Pt(10)
run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)
run.italic = True

# ── Save ──
output_path = r'C:\Users\权子豪\Desktop\灵山AI导览_作品说明文档.docx'
doc.save(output_path)
print(f'Document saved to: {output_path}')
print(f'Done!')
