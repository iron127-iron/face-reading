const FACE_READINGS = {
  forehead: {
    name: '額頭 / 天庭',
    desc: '主早年運勢（1-30歲），代表智慧與貴氣',
    traits: [
      { condition: (m) => m.foreheadRatio > 0.32, label: '額頭寬廣飽滿', text: '天庭飽滿，額頭寬廣，主聰明智慧過人，早年運勢亨通，貴人相助，學業事業皆有所成。', score: 85 },
      { condition: (m) => m.foreheadRatio < 0.26, label: '額頭較窄', text: '額頭偏窄，早年較為辛苦，需靠自身努力奮鬥，但中年後運勢漸佳。', score: 55 },
      { condition: (m) => m.foreheadRatio >= 0.26 && m.foreheadRatio <= 0.32, label: '額頭適中', text: '額頭大小適中，平衡發展，早年平穩，智慧與運勢中庸，靠努力可成大器。', score: 70 }
    ]
  },
  eyebrows: {
    name: '眉毛 / 眉',
    desc: '主兄弟宮，代表手足情誼與事業貴人',
    traits: [
      { condition: (m) => m.eyebrowGap > 0.05, label: '眉寬有距', text: '雙眉間距寬闊，心胸開闊，氣量大，善於交際，貴人運佳。', score: 80 },
      { condition: (m) => m.eyebrowGap < 0.03, label: '眉近相連', text: '雙眉距離較近，個性較為執著專注，易鑽牛角尖，要注意人際關係。', score: 50 },
      { condition: (m) => m.eyebrowGap >= 0.03 && m.eyebrowGap <= 0.05, label: '眉距適中', text: '眉毛間距標準，性格穩重，待人處事得宜，貴人運平穩。', score: 65 }
    ]
  },
  eyes: {
    name: '眼睛 / 眼',
    desc: '主心靈之窗，代表精神狀態與智慧',
    traits: [
      { condition: (m) => m.eyeRatio > 0.28, label: '大眼有神', text: '眼睛大而有神，熱情開朗，充滿魅力，領導力強，事業運佳。', score: 85 },
      { condition: (m) => m.eyeRatio < 0.22, label: '小眼精明', text: '眼睛偏小但目光銳利，心思縝密，觀察力強，善於理財。', score: 70 },
      { condition: (m) => m.eyeRatio >= 0.22 && m.eyeRatio <= 0.28, label: '眼相適中', text: '眼睛大小適中，目光穩定，為人正直，判斷力準確，福祿雙全。', score: 75 }
    ]
  },
  nose: {
    name: '鼻子 / 鼻',
    desc: '主財帛宮，代表財運與事業成就',
    traits: [
      { condition: (m) => m.noseRatio > 0.45, label: '鼻樑挺拔', text: '鼻樑高挺直貫，財運亨通，事業有成，中年運勢極佳，能聚財守業。', score: 90 },
      { condition: (m) => m.noseRatio < 0.38, label: '鼻樑較短', text: '鼻樑偏短，財運需靠努力積累，不宜投機，穩健理財方能致富。', score: 55 },
      { condition: (m) => m.noseRatio >= 0.38 && m.noseRatio <= 0.45, label: '鼻相端正', text: '鼻子端正適中，財運平穩，正財運佳，一生衣食無憂。', score: 70 }
    ]
  },
  mouth: {
    name: '嘴巴 / 口',
    desc: '主食祿宮，代表口福、人際關係與表達能力',
    traits: [
      { condition: (m) => m.mouthRatio > 0.38, label: '嘴大唇厚', text: '嘴型偏大，為人豪爽大方，善於交際，食祿豐厚，一生不愁吃穿。', score: 80 },
      { condition: (m) => m.mouthRatio < 0.30, label: '小嘴矜持', text: '嘴型偏小，個性內斂謹慎，說話有分寸，適合從事精細工作。', score: 60 },
      { condition: (m) => m.mouthRatio >= 0.30 && m.mouthRatio <= 0.38, label: '嘴型標準', text: '嘴型大小適中，唇色紅潤，為人能言善道，人緣佳，福祿雙全。', score: 75 }
    ]
  },
  chin: {
    name: '下巴 / 地閣',
    desc: '主晚年運勢（60歲後），代表毅力與福氣',
    traits: [
      { condition: (m) => m.chinRatio > 0.28, label: '下巴圓潤', text: '下巴圓潤飽滿，晚年運勢極佳，福祿雙全，子女孝順，生活安逸。', score: 90 },
      { condition: (m) => m.chinRatio < 0.22, label: '下巴較尖', text: '下巴偏尖，晚年需靠自身積累，個性較為理想主義，要注意理財。', score: 50 },
      { condition: (m) => m.chinRatio >= 0.22 && m.chinRatio <= 0.28, label: '下巴適中', text: '下巴大小適中，晚年平穩，一生福祿均衡。', score: 70 }
    ]
  },
  ears: {
    name: '耳朵 / 耳',
    desc: '主先天福氣，代表長壽與健康',
    traits: [
      { condition: (m) => m.earRatio > 0.35, label: '耳大垂厚', text: '耳朵大有垂珠，先天福氣深厚，長壽健康，一生貴人扶持。', score: 90 },
      { condition: (m) => m.earRatio < 0.28, label: '耳小貼腦', text: '耳朵偏小，個性低調穩重，雖先天福氣略薄，但後天努力可補。', score: 55 },
      { condition: (m) => m.earRatio >= 0.28 && m.earRatio <= 0.35, label: '耳相端正', text: '耳朵大小適中，貼腦端正，一生平順安康，福壽雙全。', score: 75 }
    ]
  }
};

const FORTUNE_TYPES = [
  {
    id: 'career',
    name: '事業運',
    icon: '🏛️',
    weight: { forehead: 0.25, eyebrows: 0.15, eyes: 0.25, nose: 0.2, mouth: 0.05, chin: 0.05, ears: 0.05 }
  },
  {
    id: 'wealth',
    name: '財運',
    icon: '💰',
    weight: { forehead: 0.1, eyebrows: 0.05, eyes: 0.15, nose: 0.5, mouth: 0.1, chin: 0.05, ears: 0.05 }
  },
  {
    id: 'love',
    name: '感情運',
    icon: '❤️',
    weight: { forehead: 0.05, eyebrows: 0.1, eyes: 0.35, nose: 0.1, mouth: 0.25, chin: 0.1, ears: 0.05 }
  },
  {
    id: 'health',
    name: '健康運',
    icon: '🍃',
    weight: { forehead: 0.05, eyebrows: 0.05, eyes: 0.2, nose: 0.15, mouth: 0.15, chin: 0.1, ears: 0.3 }
  },
  {
    id: 'mentor',
    name: '貴人運',
    icon: '⭐',
    weight: { forehead: 0.25, eyebrows: 0.25, eyes: 0.15, nose: 0.1, mouth: 0.1, chin: 0.05, ears: 0.1 }
  }
];
