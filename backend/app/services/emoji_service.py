from typing import Optional

EMOJI_BY_WORD = {
    "apple": "🍎", "banana": "🍌", "orange": "🍊", "grape": "🍇",
    "strawberry": "🍓", "watermelon": "🍉", "pineapple": "🍍",
    "lemon": "🍋", "peach": "🍑", "cherry": "🍒",
    "bread": "🍞", "cake": "🍰", "pizza": "🍕", "burger": "🍔",
    "ice cream": "🍦", "milk": "🥛", "cheese": "🧀", "egg": "🥚",
    "cookie": "🍪", "donut": "🍩", "candy": "🍬", "popcorn": "🍿",
    "rice": "🍚", "carrot": "🥕", "pepper": "🌶️", "salad": "🥗",
    "pita": "🥙", "chocolate": "🍫", "popsicle": "🍦", "sweet": "🍭",

    "dog": "🐶", "cat": "🐱", "fish": "🐟", "bird": "🐦",
    "horse": "🐴", "cow": "🐮", "pig": "🐷", "sheep": "🐑",
    "mouse": "🐭", "rabbit": "🐰", "frog": "🐸", "lion": "🦁",
    "tiger": "🐯", "bear": "🐻", "elephant": "🐘", "monkey": "🐵",
    "fox": "🦊", "wolf": "🐺", "dragon": "🐲", "dolphin": "🐬",
    "whale": "🐳", "snake": "🐍", "butterfly": "🦋", "bee": "🐝",
    "spider": "🕷️", "octopus": "🐙", "duck": "🦆", "chicken": "🐔",
    "owl": "🦉", "turtle": "🐢", "penguin": "🐧",
    "shark": "🦈", "zebra": "🦓", "crow": "🐦", "parrot": "🦜",

    "sun": "☀️", "moon": "🌙", "star": "⭐", "rainbow": "🌈",
    "cloud": "☁️", "snow": "❄️", "rain": "🌧️", "tree": "🌳",
    "flower": "🌸", "leaf": "🍃", "mountain": "⛰️", "fire": "🔥",
    "water": "💧", "ocean": "🌊", "ice": "🧊", "grass": "🌿",

    "car": "🚗", "bus": "🚌", "train": "🚂", "plane": "✈️",
    "boat": "⛵", "rocket": "🚀", "bike": "🚲", "helicopter": "🚁",
    "ball": "⚽", "book": "📚", "pencil": "✏️", "chair": "🪑",
    "table": "🍽️", "bed": "🛏️", "lamp": "💡", "key": "🔑",
    "gift": "🎁", "hat": "🎩", "shoe": "👟", "bag": "🎒",
    "clock": "🕒", "phone": "📱", "computer": "💻", "tv": "📺",
    "camera": "📷", "guitar": "🎸", "drum": "🥁", "balloon": "🎈",
    "knife": "🔪", "fork": "🍴", "puzzle": "🧩", "flag": "🚩",
    "door": "🚪", "faucet": "🚰", "movie": "🎬", "bridge": "🌉",
    "box": "📦", "radio": "📻", "kettle": "🫖", "wallet": "👛",
    "game": "🎮", "tower": "🗼", "ticket": "🎫", "notebook": "📓",
    "screwdriver": "🪛", "wheel": "🛞", "bottle": "🍼",
    "button": "🔘", "traffic light": "🚦", "helmet": "⛑️",
    "scarf": "🧣", "bubbles": "🫧", "curtain": "🪟", "hammer": "🔨",
    "newspaper": "📰", "candle": "🕯️", "couch": "🛋️",
    "teddy bear": "🧸", "pin": "📌", "classroom": "🏫", "map": "🗺️",
    "sukkah": "⛺", "sabbath": "🕯️",

    "shirt": "👕", "dress": "👗", "coat": "🧥", "sock": "🧦",
    "sandal": "🩴",

    "hand": "✋", "eye": "👁️", "ear": "👂", "mouth": "👄",
    "foot": "🦶", "tooth": "🦷", "heart": "❤️", "finger": "👆",

    "mom": "👩", "dad": "👨", "baby": "👶", "girl": "👧",
    "boy": "👦", "grandma": "👵", "grandpa": "👴",
    "police": "👮", "teacher": "👩‍🏫",

    "smile": "😊", "cry": "😢", "angry": "😠", "sleep": "😴",
    "hello": "👋", "thanks": "🙏",

    "red": "🔴", "circle": "⭕", "four": "4️⃣", "number": "🔢",
}

HEBREW_TO_ENGLISH = {
    # food
    "תפוח": "apple", "בננה": "banana", "תפוז": "orange", "ענב": "grape",
    "תות": "strawberry", "אבטיח": "watermelon", "אננס": "pineapple",
    "לימון": "lemon", "אפרסק": "peach", "דובדבן": "cherry",
    "לחם": "bread", "עוגה": "cake", "פיצה": "pizza", "המבורגר": "burger",
    "גלידה": "ice cream", "חלב": "milk", "גבינה": "cheese", "ביצה": "egg",
    "עוגיה": "cookie", "סופגניה": "donut", "סוכריה": "candy",
    "אורז": "rice", "גזר": "carrot", "פלפל": "pepper", "סלט": "salad",
    "פיתה": "pita", "שוקו": "chocolate", "ארטיק": "popsicle",
    "קרטיב": "popsicle", "מתוק": "sweet", "חלה": "bread",
    "במבה": "snack", "מסטיק": "gum", "רימון": "pomegranate",

    # animals
    "כלב": "dog", "חתול": "cat", "דג": "fish", "ציפור": "bird",
    "סוס": "horse", "פרה": "cow", "חזיר": "pig", "כבש": "sheep",
    "כבשה": "sheep",
    "עכבר": "mouse", "ארנב": "rabbit", "צפרדע": "frog", "אריה": "lion",
    "נמר": "tiger", "דוב": "bear", "פיל": "elephant", "קוף": "monkey",
    "שועל": "fox", "זאב": "wolf", "דרקון": "dragon", "דולפין": "dolphin",
    "לוויתן": "whale", "נחש": "snake", "פרפר": "butterfly", "דבורה": "bee",
    "תמנון": "octopus", "ברווז": "duck", "תרנגול": "chicken", "ינשוף": "owl",
    "צב": "turtle", "פינגווין": "penguin",
    "כריש": "shark", "זברה": "zebra", "עורב": "crow", "תוכי": "parrot",

    # nature
    "שמש": "sun", "ירח": "moon", "כוכב": "star", "קשת": "rainbow",
    "ענן": "cloud", "שלג": "snow", "גשם": "rain", "עץ": "tree",
    "פרח": "flower", "עלה": "leaf", "הר": "mountain", "אש": "fire",
    "מים": "water", "ים": "ocean",
    "קרח": "ice", "דשא": "grass",

    # vehicles
    "מכונית": "car", "אוטו": "car", "אוטובוס": "bus", "רכבת": "train",
    "מטוס": "plane", "מסוק": "helicopter", "סירה": "boat",
    "טיל": "rocket", "אופניים": "bike",

    # objects
    "כדור": "ball", "ספר": "book", "עיפרון": "pencil", "כיסא": "chair",
    "שולחן": "table", "מיטה": "bed", "מנורה": "lamp", "מפתח": "key",
    "מתנה": "gift", "כובע": "hat", "נעל": "shoe", "תיק": "bag",
    "שעון": "clock", "טלפון": "phone", "מחשב": "computer",
    "טלוויזיה": "tv", "מצלמה": "camera", "גיטרה": "guitar", "תוף": "drum",
    "בלון": "balloon",
    "סכין": "knife", "מזלג": "fork", "פאזל": "puzzle", "דגל": "flag",
    "דלת": "door", "ברז": "faucet", "סרט": "movie", "גשר": "bridge",
    "קופסא": "box", "ארגז": "box", "רדיו": "radio", "קומקום": "kettle",
    "ארנק": "wallet", "משחק": "game", "מגדל": "tower", "כרטיס": "ticket",
    "ילקוט": "bag", "מחברת": "notebook", "מברג": "screwdriver",
    "גלגל": "wheel", "בקבוק": "bottle", "כפתור": "button",
    "רמזור": "traffic light", "קסדה": "helmet", "וילון": "curtain",
    "פטיש": "hammer", "עיתון": "newspaper", "נרות": "candle",
    "ספה": "couch", "דובי": "teddy bear", "סיכה": "pin",
    "כיתה": "classroom", "מפה": "map", "בועות": "bubbles",
    "צעיף": "scarf", "ארון": "closet", "רצפה": "floor",
    "מסרק": "comb", "קלמר": "pencil case", "מסמר": "nail",
    "גפרור": "match", "משפך": "funnel", "עגיל": "earring",
    "גמד": "dwarf", "חבית": "barrel", "בובה": "doll",

    # clothing
    "חולצה": "shirt", "שמלה": "dress", "מעיל": "coat", "גרב": "sock",
    "סנדל": "sandal",

    # body
    "יד": "hand", "עין": "eye", "אוזן": "ear", "פה": "mouth",
    "רגל": "foot", "שן": "tooth", "לב": "heart",
    "אצבע": "finger", "בטן": "belly",

    # people
    "אמא": "mom", "אבא": "dad", "תינוק": "baby",
    "ילדה": "girl", "ילד": "boy", "סבתא": "grandma", "סבא": "grandpa",
    "שוטר": "police", "מורה": "teacher",

    # holiday
    "שבת": "sabbath", "סוכה": "sukkah",

    # abstract / greetings
    "שלום": "hello", "תודה": "thanks",

    # color / shape / number
    "אדום": "red", "עיגול": "circle", "ארבע": "four", "מספר": "number",
}


ENGLISH_TO_HEBREW: dict = {}
for _he, _en in HEBREW_TO_ENGLISH.items():
    ENGLISH_TO_HEBREW.setdefault(_en, _he)


def _normalize(text: str) -> str:
    return text.strip().lower()


def translate_to_english(word: str, language: str) -> str:
    if language == "he":
        return HEBREW_TO_ENGLISH.get(_normalize(word), "")
    return _normalize(word)


def translate(word: str, from_language: str, to_language: str) -> Optional[str]:
    if from_language == to_language:
        return word.strip()
    key = _normalize(word)
    if from_language == "en" and to_language == "he":
        return ENGLISH_TO_HEBREW.get(key)
    if from_language == "he" and to_language == "en":
        return HEBREW_TO_ENGLISH.get(key)
    return None


def lookup_emoji(word: str, language: str) -> Optional[str]:
    english = translate_to_english(word, language)
    if not english:
        return None
    return EMOJI_BY_WORD.get(english)
