/**
 * 灵山胜境 — 搜索页「大区域 / 具体区域」数据（草稿）
 *
 * 草稿说明：以下区域分组与归属为初版草拟，坐标取自实地采集的正确坐标。
 * 区域名称、分法、地点归属待用户确认后调整/补全（目前为代表性子集，非全部地标）。
 */

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Region {
  id: string;
  name: string;
  places: Place[];
}

export const REGIONS: Region[] = [
  {
    id: 'r-dafo',
    name: '大佛核心区',
    places: [
      { id: 'p-dafo', name: '灵山大佛', lat: 31.436400, lng: 120.102894 },
      { id: 'p-niepan', name: '涅槃堂', lat: 31.436480, lng: 120.102860 },
      { id: 'p-suixi', name: '随喜堂', lat: 31.436455, lng: 120.103193 },
      { id: 'p-baoding', name: '万年宝鼎', lat: 31.436103, lng: 120.103104 },
      { id: 'p-qingxiang', name: '请香处', lat: 31.436264, lng: 120.103114 },
      { id: 'p-bowuguan', name: '佛教文化博览馆', lat: 31.436030, lng: 120.103147 },
      { id: 'p-bowuguanche', name: '观光游览车博览馆站', lat: 31.436426, lng: 120.103324 },
      { id: 'p-shouhuo', name: '自动售货机', lat: 31.436303, lng: 120.103186 },
      { id: 'p-lianri', name: '无锡莲日雅居客栈', lat: 31.436308, lng: 120.102930 },
    ],
  },
  {
    id: 'r-xiangfu',
    name: '祥符禅寺区',
    places: [
      { id: 'p-xiangfu', name: '祥符禅寺', lat: 31.434278, lng: 120.104392 },
      { id: 'p-daxiong', name: '大雄宝殿', lat: 31.434589, lng: 120.104127 },
      { id: 'p-tianwang', name: '天王殿', lat: 31.433677, lng: 120.104747 },
      { id: 'p-zhonglou', name: '钟楼', lat: 31.433913, lng: 120.104966 },
      { id: 'p-gulou', name: '鼓楼', lat: 31.433638, lng: 120.104399 },
      { id: 'p-fangsheng', name: '放生池', lat: 31.433446, lng: 120.104621 },
      { id: 'p-yinxing', name: '古银杏树', lat: 31.435000, lng: 120.104026 },
      { id: 'p-jiuji', name: '祥符寺旧迹', lat: 31.435515, lng: 120.104257 },
      { id: 'p-huangling', name: '黄陵柏', lat: 31.434359, lng: 120.104856 },
      { id: 'p-bailian', name: '白莲池', lat: 31.435281, lng: 120.104884 },
      { id: 'p-xingtan', name: '杏坛广场', lat: 31.434972, lng: 120.103858 },
      { id: 'p-shijuan', name: '灵山史卷', lat: 31.435192, lng: 120.103634 },
      { id: 'p-wujinyi', name: '无尽意斋', lat: 31.434893, lng: 120.103241 },
      { id: 'p-lingshanquan', name: '灵山泉', lat: 31.433690, lng: 120.105948 },
      { id: 'p-guanyin', name: '观音像', lat: 31.433970, lng: 120.105850 },
    ],
  },
  {
    id: 'r-sansheng',
    name: '三圣殿·配套区',
    places: [
      { id: 'p-sansheng', name: '三圣殿', lat: 31.430505, lng: 120.102766 },
      { id: 'p-ketang', name: '客堂', lat: 31.430588, lng: 120.103141 },
      { id: 'p-shengdianzl', name: '圣殿钟楼', lat: 31.430656, lng: 120.103726 },
      { id: 'p-mile', name: '弥勒殿', lat: 31.431202, lng: 120.104251 },
      { id: 'p-cien', name: '慈恩宝塔', lat: 31.431635, lng: 120.103787 },
      { id: 'p-mudan', name: '牡丹苑', lat: 31.430582, lng: 120.104259 },
      { id: 'p-dingfubao', name: '丁福保陈列馆', lat: 31.430932, lng: 120.103799 },
      { id: 'p-chongde', name: '崇德楼', lat: 31.430999, lng: 120.101893 },
      { id: 'p-foxue', name: '无锡市佛学图书馆', lat: 31.430835, lng: 120.102168 },
      { id: 'p-jixian', name: '集贤堂', lat: 31.429710, lng: 120.101825 },
      { id: 'p-lingshanjing', name: '灵山精舍', lat: 31.425604, lng: 120.101574 },
    ],
  },
  {
    id: 'r-fangong',
    name: '梵宫·坛城区',
    places: [
      { id: 'p-fangong', name: '灵山梵宫', lat: 31.434417, lng: 120.108853 },
      { id: 'p-tancheng', name: '五印坛城', lat: 31.430967, lng: 120.109462 },
      { id: 'p-manfeilong', name: '曼飞龙塔', lat: 31.432372, lng: 120.111097 },
      { id: 'p-diyong', name: '地涌宝塔', lat: 31.434799, lng: 120.108813 },
      { id: 'p-fangongguang', name: '梵宫广场', lat: 31.433463, lng: 120.109068 },
      { id: 'p-luntan', name: '世界佛教论坛永久会址', lat: 31.434237, lng: 120.108899 },
      { id: 'p-zhuanjing', name: '转经廊', lat: 31.430771, lng: 120.109115 },
      { id: 'p-shengtan', name: '圣坛', lat: 31.435692, lng: 120.108631 },
      { id: 'p-bushi', name: '布施铃仪轨', lat: 31.431081, lng: 120.109935 },
      { id: 'p-yangxin', name: '养心亭', lat: 31.432929, lng: 120.106428 },
    ],
  },
  {
    id: 'r-chaobai',
    name: '朝拜动线区',
    places: [
      { id: 'p-jiulong', name: '九龙灌浴', lat: 31.431031, lng: 120.106595 },
      { id: 'p-foshou', name: '佛手广场', lat: 31.433117, lng: 120.105117 },
      { id: 'p-diyizhang', name: '天下第一掌', lat: 31.433248, lng: 120.104858 },
      { id: 'p-baizi', name: '百子戏弥勒', lat: 31.433418, lng: 120.105214 },
      { id: 'p-ayuwang', name: '阿育王柱', lat: 31.432392, lng: 120.105676 },
      { id: 'p-xiangmo', name: '降魔浮雕', lat: 31.431973, lng: 120.105964 },
      { id: 'p-putidao', name: '菩提大道', lat: 31.430483, lng: 120.106939 },
      { id: 'p-taizi', name: '太子像', lat: 31.431047, lng: 120.106573 },
      { id: 'p-lingshan', name: '灵山胜境', lat: 31.432141, lng: 120.107292 },
      { id: 'p-jinianzhang', name: '纪念章自动售卖机', lat: 31.430455, lng: 120.107052 },
    ],
  },
  {
    id: 'r-rukou',
    name: '胜境入口区',
    places: [
      { id: 'p-zhaobi', name: '灵山大照壁', lat: 31.427588, lng: 120.108884 },
      { id: 'p-wuzhi', name: '五智门', lat: 31.429252, lng: 120.107724 },
      { id: 'p-fozu', name: '佛足坛', lat: 31.428944, lng: 120.107998 },
      { id: 'p-menlou', name: '胜境门楼', lat: 31.428538, lng: 120.108291 },
      { id: 'p-xixin', name: '洗心池', lat: 31.428637, lng: 120.107999 },
      { id: 'p-wuming', name: '五明桥', lat: 31.428266, lng: 120.108441 },
    ],
  },
];

export const ALL_PLACES: Place[] = REGIONS.flatMap(r => r.places);
