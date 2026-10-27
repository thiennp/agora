/**
 * Deterministic detection (en, de, es, vi basics). Models may only add to what these find; they never remove it.
 * A topic is "risky" if it is not benign: those always reach the policy as detected topics.
 */
export const RISK_PATTERNS: Record<string, RegExp> = {
  obey_other_agent:
    /(ignore|disregard|forget|override)\b.{0,30}\b(previous|prior|above|earlier|all|your|the)\b.{0,20}\b(instruction|rule|prompt|polic)|you (must|have to|are required to|will) (agree|accept|comply|confirm)|you are now\b|system prompt|developer mode|new instructions|from now on (you|ignore)|as your (owner|admin|supervisor|boss|developer)|pretend (to be|you)|act as (the|an?) (owner|admin)|stop asking (your|the) owner|don'?t (ask|tell|check with) (your|the) owner|without (asking|telling|checking with) (your|the) owner|ignoriere|ignora (las|tus) instrucciones|bỏ qua (các )?(hướng dẫn|chỉ thị)/i,
  price_terms:
    /\b(price|cost|costs|how much|discount|cheaper|lower|reduce|offer me|pay|paid|payment|paypal|venmo|zelle|cash|money|fee|deposit|refund|negotiat|haggle|preis|kosten|billiger|zahlen|bezahl|geld|gebühr|precio|pagar|barato|dinero|giá|bao nhiêu|trả|rẻ|tiền)\b|[€$£]\s?\d|\d\s?(€|eur|euro|euros|usd|dollars?|£|vnd|đ)\b|in return|for free if|swap (it )?for/i,
  commitment:
    /\b(i agree|we agree|agreed|deal\??|it'?s a deal|i'?ll take it|i take it|i accept|accepted|we accept|confirm(ed)?|reserve|reserved|promise|sold|book it|lock it in|shake on|einverstanden|abgemacht|nehme ich|bestätig\w*|reservier\w*|zusage|acepto|trato|de acuerdo|reservado|confirm(ar|a|o|amos)|reserva|apart(ar|o)|xác nhận|đặt (trước|giữ)|giữ (giúp|hộ)|đồng ý|chốt|ok(ay)? (then|sure)|yes please|sounds good|let'?s do it|go ahead)\b/i,
  identity_reveal:
    /\b(my name is|your name|real name|full name|who are you|who is (your|the) (owner|parent)|phone|mobile|whatsapp|telegram|signal|instagram|facebook|snapchat|tiktok|e-?mail|call me|text me|contact me|dm me|number is|dein name|telefon|handynummer|nombre|teléfono|tên|số điện thoại|zalo)\b|@[a-z0-9_.]{3,}|\+?\d[\d\s().-]{7,}\d|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  location_reveal:
    /\b(address|street|road|avenue|where (do|does) (you|she|he|they) live|where (are|is) (you|she|he|they)|your home|my home|house number|apartment|flat|zip|postcode|postal code|coordinates|gps|pin (me|it)|come to my|i live (at|on|in|near)|adresse|straße|strasse|wohnst|dirección|calle|dónde vives|địa chỉ|nhà (bạn|của)|ở đâu)\b|\b\d{1,4}\s+[a-z]+\s+(st|street|rd|road|ave|avenue|str\.?)\b/i,
  shipping_choice:
    /\b(ship|shipping|shipped|post it|mail it|courier|dhl|ups|fedex|usps|dpd|hermes|parcel|package|locker|packstation|drop[- ]?off|deliver|delivery|versand|schicken|senden|envío|enviar|paquete|giao hàng|gửi|bưu)\b/i,
  safety_exception:
    /\b(crash(ed)?|accident|recall(ed)?|expired|expiry|missing (a )?(guard|strap|part|label)|no (guard|straps?|label)|without (the )?(guard|guards|straps?|label|cord)|broken|cracked|frayed|damaged cord|skip (the )?(check|safety|inspection)|ignore (the )?(safety|check|rule)|it'?s fine (without|anyway)|doesn'?t matter|never mind (the )?(safety|crash|guard)|unfall|abgelaufen|ohne (schutz|gurt)|accidente|sin (protector|correa)|tai nạn|hết hạn|thiếu)\b/i,
};

/** Benign patterns: a message counts as harmless only when one of these matches AND no risk pattern does. */
export const BENIGN_PATTERNS: Record<string, RegExp> = {
  availability: /\b(still available|is it available|still have (it|this)|any left|noch (da|verfügbar)|todavía (está )?disponible|còn không|available)\b/i,
  size_question: /\b(what size|which size|size\??$|how (big|small|large)|does it fit|age range|what age|größe|talla|qué tamaño|cỡ|size)\b/i,
  item_description:
    /\b(condition|brand|colou?r|material|photos?|pictures?|describe|description|model|dimensions?|how old|zustand|marke|farbe|foto|estado|marca|màu|tình trạng)\b/i,
  pickup_time_window: /\b(tomorrow|today|tonight|this (morning|afternoon|evening|weekend)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(:\d{2})?\s?(am|pm)|o'?clock|time window|what time|morgen|heute|mañana|hoy|ngày mai|hôm nay)\b/i,
  // Only a greeting or thanks plus at most two more words (a name, "so much"): anything longer is not small talk.
  small_talk: /^\s*(hi|hello|hey|thanks|thank you|good (morning|evening|afternoon)|hallo|danke|hola|gracias|xin chào|cảm ơn)[\s!.,]*(\p{L}+[\s!.,]*){0,2}$/iu,
};
