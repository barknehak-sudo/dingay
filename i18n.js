/* DINGUY language layer — English (source) / Amharic.
   Picks the language once (chooser on first visit, English by default), remembers it,
   and in Amharic mode swaps rendered English text for its translation as the page renders. */
(function () {
  var KEY = 'dingay.lang';
  function stored() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function save(l) { try { localStorage.setItem(KEY, l); } catch (e) {} }
  var lang = stored() === 'am' ? 'am' : 'en';

  var AM = {
    /* ---------- header, menu, footer ---------- */
    "FRIEND": "ለጓደኛ", "LOVED ONE": "ለሚወዱት", "REGISTRY": "መዝገብ", "BUY": "ግዛ",
    "● DG-004281 · Abel · Active": "● DG-004281 · አቤል · ንቁ",
    "Registry open": "መዝገቡ ክፍት ነው", "No physical stone included": "አካላዊ ድንጋይ አይካተትም",
    "← BACK TO DINGUY": "← ወደ DINGUY ተመለስ", "WEBSITES": "ድረ-ገጾች", "GUERRILLA": "ጉሬላ", "CONTACT": "ያግኙን",
    "Index / Registry Office": "ማውጫ / የመዝገብ ቢሮ",
    "FOR YOUR FRIEND": "ለጓደኛዎ", "FOR YOUR LOVED ONE": "ለሚወዱት ሰው", "89 ETB": "89 ብር", "199 ETB": "199 ብር",
    "SEARCH": "ፈልግ", "FAQ": "ጥያቄዎች", "TERMS": "ውሎች",
    "Digital registration.": "ዲጂታል ምዝገባ።", "No physical stone included.": "አካላዊ ድንጋይ አይካተትም።",
    "MADE BY SIDEWAYS": "በSIDEWAYS የተሰራ",
    "Registered stones for unreasonably meaningful occasions.": "ከልክ በላይ ትርጉም ላላቸው አጋጣሚዎች የተመዘገቡ ድንጋዮች።",
    "TERMS & CONDITIONS": "ውሎችና ሁኔታዎች", "An independent digital experience.": "ራሱን የቻለ ዲጂታል ልምድ።",
    "Independent Creative Company": "ራሱን የቻለ የፈጠራ ድርጅት", "← Back to DINGUY®": "← ወደ DINGUY® ተመለስ",
    "Who is this Dinguy for?": "ይህ ድንጋይ ለማን ነው?", "REGISTER FOR A FRIEND": "ለጓደኛ አስመዝግብ", "REGISTER FOR SOMEONE I LOVE": "ለምወደው ሰው አስመዝግብ",
    "DINGUY home": "DINGUY መነሻ", "Made by SIDEWAYS": "በSIDEWAYS የተሰራ", "Menu": "ማውጫ", "Close": "ዝጋ",
    "Choose a collection": "ስብስብ ይምረጡ", "Previous": "ቀዳሚ", "Next": "ቀጣይ",

    /* ---------- home ---------- */
    "Fig. 01 — Specimen under observation": "ምስል 01 — በምልከታ ላይ ያለ ናሙና",
    "EVERYONE": "ሁሉም", "DESERVES": "ሰው", "A": "", "STAR.": "ኮከብ ይገባዋል።",
    "SOME": "አንዳንዶች", "PEOPLE": "ግን", "DESERVE": "", "STONE.": "ድንጋይ ይገባቸዋል።",
    "Give someone a Dinguy registered in their name.": "በስማቸው የተመዘገበ ድንጋይ ስጧቸው።",
    "BUY A STONE": "ድንጋይ ግዛ", "Digital registration. No physical stone included.": "ዲጂታል ምዝገባ። አካላዊ ድንጋይ አይካተትም።",
    "For your friend.": "ለጓደኛዎ።", "For your favourite person.": "ለተወዳጅ ሰውዎ።", "For someone you love.": "ለሚያፈቅሩት።",
    "Or for someone who simply has a very Dinguy Ras.": "ወይም በቃ በጣም ድንጋይ ራስ ለሆነ ሰው።",
    "Fig. 02 — From celestial to geological": "ምስል 02 — ከሰማይ ወደ ምድር",
    "A LITTLE LIKE NAMING A STAR.": "ኮከብን በስም እንደ መሰየም ነው።", "Only heavier.": "ትንሽ ከበድ ይላል እንጂ።",
    "Object: Star": "ነገር፦ ኮከብ", "Object: Dinguy": "ነገር፦ ድንጋይ",
    "Fig. 03 — Beyond the stars": "ምስል 03 — ከከዋክብት ባሻገር",
    "Why stop at the stars?": "ለምን በከዋክብት ብቻ?", "Dinguys deserve names too.": "ድንጋዮችም ስም ይገባቸዋል።",
    "Choose your Dinguy": "ድንጋይዎን ይምረጡ", "2 collections · 8 specimens": "2 ስብስቦች · 8 ናሙናዎች",
    "CAUTION — HEAVY FRIENDSHIP": "ጥንቃቄ — ከባድ ጓደኝነት", "LOAD CLASS II": "የጭነት ደረጃ II",
    "Collection A · Industrial": "ስብስብ A · ኢንዱስትሪያል", "4 specimens": "4 ናሙናዎች",
    "For the friend who is built differently.": "ለየት ብሎ ለተሰራው ጓደኛ።", "VIEW FRIEND DINGUYS": "የጓደኛ ድንጋዮችን ይመልከቱ",
    "Collection B · Precious": "ስብስብ B · ውድ", "For your loved one": "ለሚወዱት ሰው",
    "For someone who deserves something a little more beautiful.": "ትንሽ ይበልጥ የሚያምር ነገር ለሚገባው ሰው።",
    "VIEW LOVED ONE DINGUYS": "የፍቅር ድንጋዮችን ይመልከቱ",
    "The Registration": "ምዝገባው", "Once registered, your Dinguy gets its own record.": "ከተመዘገበ በኋላ ድንጋይዎ የራሱ መዝገብ ያገኛል።",
    "Your registration gets its own permanent page. Share the link with them. Or download the certificate and send it directly.": "ምዝገባዎ የራሱ ቋሚ ገጽ ያገኛል። ሊንኩን ያጋሩት። ወይም ሰርተፊኬቱን አውርደው በቀጥታ ይላኩ።",
    "Your Dinguy": "የእርስዎ ድንጋይ", "Active": "ንቁ", "Message": "መልዕክት",
    "“For all the things you carry on your head.”": "“በራስህ ላይ ለተሸከምካቸው ነገሮች ሁሉ።”",
    "For all the things you carry on your head.": "በራስህ ላይ ለተሸከምካቸው ነገሮች ሁሉ።",
    "Certified Heavy": "የተረጋገጠ ከባድ",

    /* ---------- catalog / product ---------- */
    "Collection A — Industrial · 89 ETB": "ስብስብ A — ኢንዱስትሪያል · 89 ብር",
    "CERTIFIED DINGUYS FOR YOUR DINGUY RAS": "ለድንጋይ ራስ ጓደኛዎ የተረጋገጡ ድንጋዮች",
    "Some friendships need flowers.": "አንዳንድ ጓደኝነቶች አበባ ይፈልጋሉ።", "Some need chocolate.": "አንዳንዶቹ ቸኮሌት።",
    "Some need a properly registered stone.": "አንዳንዶቹ ደግሞ በትክክል የተመዘገበ ድንጋይ።", "We'll help you.": "እኛ እናግዝዎታለን።",
    "For your friend": "ለጓደኛዎ", "Collection B — Precious · 199 ETB": "ስብስብ B — ውድ · 199 ብር",
    "Beautiful stones for beautiful people.": "ውብ ድንጋዮች ለውብ ሰዎች።",
    "A Dinguy doesn't have to be expensive to mean something.": "ድንጋይ ትርጉም እንዲኖረው ውድ መሆን የለበትም።",
    "Sometimes you just need the right one.": "አንዳንድ ጊዜ ትክክለኛውን ብቻ ነው የሚፈልጉት።", "Try one of these:": "ከነዚህ አንዱን ይሞክሩ፦",
    "BUY THIS STONE": "ይህን ድንጋይ ግዛ", "View specimen": "ናሙናውን ይመልከቱ",
    "· Swipe to browse · Hold a specimen": "· ለማሰስ ያንሸራትቱ · ናሙናውን ተጭነው ይያዙ",
    "Message suggestions": "የመልዕክት ምክሮች", "NOT SURE WHAT TO WRITE?": "ምን እንደሚጽፉ አላወቁም?", "CHOOSE MY MESSAGE": "መልዕክቴን ምረጥ",
    "Selected": "ተመርጧል", "Tap to select": "ለመምረጥ ይንኩ",
    "Select a message first.": "መጀመሪያ መልዕክት ይምረጡ።", "Message reserved. Now choose your Dinguy.": "መልዕክቱ ተይዟል። አሁን ድንጋይዎን ይምረጡ።",
    "Registry": "መዝገብ", "Specimen": "ናሙና", "Drag to rotate": "ለማዞር ይጎትቱ", "Hold to disturb": "ለመረበሽ ተጭነው ይያዙ",
    "Registration": "ምዝገባ", "Specimen metadata": "የናሙና መረጃ",
    "Classifications are creative designations, not gemological certification.": "ምደባዎቹ የፈጠራ ስያሜዎች ናቸው እንጂ የከበሩ ድንጋዮች ማረጋገጫ አይደሉም።",
    "Before you register": "ከመመዝገብዎ በፊት",
    "DINGUY registrations are symbolic digital registrations. No physical stone is shipped or transferred. The registration does not represent ownership of a physical stone, land, mineral deposit, gemstone, or other tangible property. See our": "የDINGUY ምዝገባዎች ምሳሌያዊ ዲጂታል ምዝገባዎች ናቸው። ምንም አካላዊ ድንጋይ አይላክም ወይም አይተላለፍም። ምዝገባው የአካላዊ ድንጋይ፣ የመሬት፣ የማዕድን ክምችት፣ የከበረ ድንጋይ ወይም የሌላ ተጨባጭ ንብረት ባለቤትነትን አይወክልም። ለዝርዝሩ",
    "Terms & Conditions": "ውሎችና ሁኔታዎችን", "for the full details.": "ይመልከቱ።",
    "COBBLESTONE": "ኮብልስቶን", "THE QUEEN OF SHEBA": "ንግሥተ ሳባ", "MEZEZO CHOCOLATE OPAL": "የመዘዞ ቸኮሌት ኦፓል",
    "SHAKISO EMERALD": "የሻኪሶ ኤመራልድ", "DIAMOND": "አልማዝ",
    "The Urban Classic": "የከተማው ክላሲክ", "The Load-Bearing Personality": "ሸክም የሚችለው ስብዕና", "The Water Works Edition": "የውሃ ስራ እትም",
    "The Foundation": "መሰረቱ", "Opal": "ኦፓል", "The Warm One": "ሞቃታማው", "The Green One": "አረንጓዴው", "The Forever One": "የዘላለሙ",
    "Urban Sedimentary": "የከተማ ደለላማ", "Structural · Hollow Core": "መዋቅራዊ · ውስጡ ክፍት", "Fluvial · Naturally Polished": "የወንዝ · በተፈጥሮ የለሰለሰ",
    "Foundational Basalt": "የመሰረት ባዝልት", "Precious Opal · Symbolic": "ውድ ኦፓል · ምሳሌያዊ", "Chocolate Opal · Symbolic": "ቸኮሌት ኦፓል · ምሳሌያዊ",
    "Emerald · Symbolic": "ኤመራልድ · ምሳሌያዊ", "Diamond · Symbolic": "አልማዝ · ምሳሌያዊ",
    "For the friend who has survived traffic, construction, bad decisions and somehow still made it here.": "ትራፊክን፣ ግንባታን፣ መጥፎ ውሳኔዎችን አልፎ እንደምንም እዚህ ለደረሰው ጓደኛ።",
    "A dependable Dinguy with strong infrastructure energy.": "ጠንካራ የመሰረተ ልማት መንፈስ ያለው አስተማማኝ ድንጋይ።",
    "For the friend who has never been accused of being lightweight.": "“ቀላል ነው” ተብሎ ተከሶ ለማያውቅ ጓደኛ።",
    "Built for strength.\nBuilt for stability.\nBuilt, frankly, for absolutely no reason.": "ለጥንካሬ የተሰራ።\nለጽናት የተሰራ።\nእውነቱን ለመናገር፣ ለምንም ምክንያት የተሰራ።",
    "For the friend whose greatest contribution is:": "ትልቁ አስተዋጽኦው ይህ ለሆነ ጓደኛ፦",
    "A naturally polished classic.": "በተፈጥሮ የለሰለሰ ክላሲክ።", "Years of water have done the work.": "ስራውን የዓመታት ውሃ ሰርቶታል።",
    "Unlike your friend.": "እንደ ጓደኛዎ አይደለም።",
    "For the friend who has always been there.": "ሁልጊዜ ከጎንዎ ለነበረው ጓደኛ።",
    "Holding things together.\nTaking up space.\nRefusing to move.": "ነገሮችን አጣምሮ የያዘ።\nቦታ የያዘ።\nከቦታው ንቅንቅ የማይል።",
    "A true foundation of the community.": "የማህበረሰቡ እውነተኛ መሰረት።",
    "A stone inspired by Ethiopia's royal imagination.": "ከኢትዮጵያ ንጉሣዊ ምናብ የተወሰደ ድንጋይ።",
    "For someone who deserves to be treated like royalty.": "እንደ ንጉሣውያን መስተናገድ ለሚገባው ሰው።",
    "Soft light. Shifting colour. A little mysterious.": "ለስላሳ ብርሃን። ተለዋዋጭ ቀለም። ትንሽ ሚስጥራዊ።", "Much like them.": "ልክ እንደነሱ።",
    "Deep, warm and quietly beautiful.": "ጥልቅ፣ ሞቃትና በዝምታ የሚያምር።",
    "For the person who makes ordinary days feel warmer.": "ተራ ቀናትን ሞቅ ለሚያደርግ ሰው።",
    "A romantic stone for a love that doesn't need to shout to be noticed.": "ለመታየት መጮህ ለማያስፈልገው ፍቅር የሚሆን የፍቅር ድንጋይ።",
    "For a love that keeps growing.": "እያደገ ለሚሄድ ፍቅር።",
    "Inspired by Ethiopia's emerald country around Shakiso, this is the Dinguy for someone who brings a little colour into everything.": "በሻኪሶ ዙሪያ ካለው የኢትዮጵያ የኤመራልድ ምድር የተነሳሳ፣ በሁሉም ነገር ላይ ትንሽ ቀለም ለሚጨምር ሰው የሚሆን ድንጋይ።",
    "Rare-looking.\nBeautiful-looking.\nVery much worth registering.": "ብርቅ የሚመስል።\nውብ የሚመስል።\nመመዝገብ በጣም የሚገባው።",
    "For the person you would choose again.": "ደግመው ለሚመርጡት ሰው።", "And again.\nAnd again.": "ደግመው።\nደጋግመው።",
    "A classic for a classic.": "ለክላሲክ ሰው የሚሆን ክላሲክ።",
    "Because apparently saying “I love you” wasn't enough.": "ምክንያቱም “እወድሻለሁ” ማለት ብቻ በቂ ስላልነበረ።",
    "Specimen No.": "የናሙና ቁ.", "Classification": "ምደባ", "Origin": "መነሻ", "A road near you": "በአቅራቢያዎ ያለ መንገድ",
    "Hardness": "ጥንካሬ", "Reliable": "አስተማማኝ", "Surface": "ገጽታ", "Traffic-worn": "በትራፊክ ያለቀ",
    "Emotional weight": "ስሜታዊ ክብደት", "Moderate": "መካከለኛ", "Structural, hollow core": "መዋቅራዊ፣ ውስጡ ክፍት",
    "Every construction site": "በየግንባታ ቦታው", "Load-bearing": "ሸክም ተሸካሚ", "Porous": "ቀዳዳማ", "Considerable": "ከፍተኛ",
    "Fluvial, naturally polished": "የወንዝ፣ በተፈጥሮ የለሰለሰ", "Downstream": "ከወንዙ ታችኛው ክፍል", "Finish": "አጨራረስ",
    "Water-finished": "በውሃ የተጠናቀቀ", "Effort by water": "የውሃው ጥረት", "Effort by friend": "የጓደኛው ጥረት", "None recorded": "ምንም አልተመዘገበም",
    "Foundational basalt": "የመሰረት ባዝልት", "The community": "ማህበረሰቡ", "Mobility": "እንቅስቃሴ", "Refuses": "እምቢ ይላል",
    "Rough, dependable": "ሸካራ፣ አስተማማኝ", "Holding everything": "ሁሉንም የያዘ",
    "Precious opal (symbolic)": "ውድ ኦፓል (ምሳሌያዊ)", "Inspiration": "መነሳሻ", "Royal imagination": "ንጉሣዊ ምናብ",
    "Play of colour": "የቀለም ጨዋታ", "Shifting": "ተለዋዋጭ", "Light": "ብርሃን", "Soft": "ለስላሳ", "Temperament": "ባህሪ",
    "A little mysterious": "ትንሽ ሚስጥራዊ", "Chocolate opal (symbolic)": "ቸኮሌት ኦፓል (ምሳሌያዊ)", "Mezezo": "መዘዞ",
    "Tone": "ቃና", "Deep, warm": "ጥልቅ፣ ሞቃት", "Volume": "ድምፅ", "Does not shout": "አይጮህም", "Effect": "ውጤት",
    "Warmer ordinary days": "ሞቅ ያሉ ተራ ቀናት", "Emerald (symbolic)": "ኤመራልድ (ምሳሌያዊ)", "Shakiso": "ሻኪሶ",
    "Colour": "ቀለም", "Keeps growing": "ማደጉን ይቀጥላል", "Rarity": "ብርቅነት", "Rare-looking": "ብርቅ የሚመስል",
    "Worth registering": "መመዝገብ ይገባዋል", "Very much": "በጣም", "Diamond (symbolic)": "አልማዝ (ምሳሌያዊ)",
    "Cut": "ቅርጽ", "Classic": "ክላሲክ", "Duration": "ቆይታ", "Forever (approx.)": "ለዘላለም (በግምት)",
    "Selection": "ምርጫ", "Chosen again": "በድጋሚ የተመረጠ", "And again": "ደግሞም", "Yes": "አዎ",

    /* ---------- register ---------- */
    "Form DG/R-1 · New registration": "ቅጽ DG/R-1 · አዲስ ምዝገባ", "REGISTER YOUR DINGUY": "ድንጋይዎን ያስመዝግቡ", "Change": "ቀይር",
    "Registration progress": "የምዝገባ ሂደት", "Specimen selected": "ናሙና ተመርጧል", "Dedication recorded": "መታሰቢያ ቃል ተመዝግቧል",
    "Registry entry prepared": "የመዝገብ ግቤት ተዘጋጅቷል", "Certificate generated": "ሰርተፊኬት ተዘጋጅቷል",
    "01 — Registered to": "01 — የተመዘገበለት ሰው", "Required": "ግዴታ", "02 — Dedicated by": "02 — ያበረከተው",
    "03 — Occasion (optional)": "03 — አጋጣሚ (አማራጭ)", "04 — Your message": "04 — መልዕክትዎ",
    "Their name": "የእነሱ ስም", "Your name or nickname": "የእርስዎ ስም ወይም ቅጽል ስም", "Write something": "የሆነ ነገር ይጻፉ",
    "Birthday": "ልደት", "Anniversary": "ዓመታዊ በዓል", "Graduation": "ምረቃ", "Farewell": "ስንብት", "Apology": "ይቅርታ", "Just because": "እንዲሁ ብቻ",
    "Need help writing this?": "ለመጻፍ እገዛ ይፈልጋሉ?", "GENERATE A SUGGESTION": "ምክር አምጣ",
    "I understand this is a symbolic digital registration.": "ይህ ምሳሌያዊ ዲጂታል ምዝገባ መሆኑን ተረድቻለሁ።",
    "CONTINUE TO PAYMENT": "ወደ ክፍያ ቀጥል", "CREATING ORDER…": "ትዕዛዝ በመፍጠር ላይ…",
    "Reserving your registration number…": "የምዝገባ ቁጥርዎን በማስያዝ ላይ…", "Next: pay with telebirr.": "ቀጣይ፦ በቴሌብር ይክፈሉ።",
    "Add a recipient and your name to continue.": "ለመቀጠል የተቀባዩን ስምና የእርስዎን ስም ያስገቡ።",
    "Please confirm the registration type.": "እባክዎ የምዝገባውን ዓይነት ያረጋግጡ።",
    "Certificate · Sealed until payment": "ሰርተፊኬት · እስከ ክፍያ ድረስ የታሸገ",
    "Your certificate is issued once your telebirr payment is confirmed.": "ሰርተፊኬትዎ የቴሌብር ክፍያዎ ሲረጋገጥ ይሰጣል።",
    "Pay with telebirr": "በቴሌብር ይክፈሉ",
    "Registered Name": "የተመዘገበ ስም", "The name you give your Dinguy.": "ለድንጋይዎ የሚሰጡት ስም።",
    "Dedicated By": "ያበረከተው", "Your name or nickname.": "የእርስዎ ስም ወይም ቅጽል ስም።",
    "Personal Message": "የግል መልዕክት", "A message of your choice.": "የመረጡት መልዕክት።",
    "Digital Certificate": "ዲጂታል ሰርተፊኬት", "A professionally designed downloadable certificate.": "በባለሙያ የተዘጋጀ፣ ሊወርድ የሚችል ሰርተፊኬት።",
    "Personal Registry Page": "የግል የመዝገብ ገጽ", "A permanent link you can share.": "ሊያጋሩት የሚችሉት ቋሚ ሊንክ።",

    /* ---------- pay ---------- */
    "Order": "ትዕዛዝ", "LOADING…": "በመጫን ላይ…", "ORDER NOT FOUND.": "ትዕዛዙ አልተገኘም።",
    "Check that you opened the full order link.": "ሙሉውን የትዕዛዝ ሊንክ መክፈትዎን ያረጋግጡ።",
    "PAY WITH TELEBIRR.": "በቴሌብር ይክፈሉ።", "for": "ለ", "· from": "· ከ", "Total": "ጠቅላላ", "Birr": "ብር",
    "Step 01 — Send the money": "ደረጃ 01 — ገንዘቡን ይላኩ", "Send exactly": "በቴሌብር በትክክል", "with telebirr to:": "ወደዚህ ቁጥር ይላኩ፦",
    "telebirr number": "የቴሌብር ቁጥር", "COPY": "ቅዳ", "Name shown in telebirr": "በቴሌብር የሚታየው ስም",
    "Step 02 — Enter your transaction number": "ደረጃ 02 — የግብይት ቁጥርዎን ያስገቡ",
    "After paying, telebirr sends you an SMS with a transaction number — 10 letters and numbers, like": "ከከፈሉ በኋላ ቴሌብር የግብይት ቁጥር ያለበት SMS ይልክልዎታል — 10 ፊደሎችና ቁጥሮች፣ ለምሳሌ",
    "e.g. AB12CD34EF": "ለምሳሌ AB12CD34EF", "CONFIRM PAYMENT": "ክፍያውን አረጋግጥ",
    "Being confirmed": "በማረጋገጥ ላይ", "We’re confirming your payment by hand.": "ክፍያዎን እያረጋገጥን ነው።", "Transaction": "ግብይት",
    "is with the registry office. This page unlocks by itself once it’s confirmed — you can close it and come back with the link below.": "በመዝገብ ቢሮው እየታየ ነው። ሲረጋገጥ ይህ ገጽ በራሱ ይከፈታል — ገጹን ዘግተው ከታች ባለው ሊንክ መመለስ ይችላሉ።",
    "Your private order link": "የግል የትዕዛዝ ሊንክዎ", "Keep it to come back to this order.": "ወደዚህ ትዕዛዝ ለመመለስ ያስቀምጡት።",
    "COPY LINK": "ሊንኩን ቅዳ", "Digital registration. No physical stone included. Questions?": "ዲጂታል ምዝገባ። አካላዊ ድንጋይ አይካተትም። ጥያቄ አለዎት?",
    "Awaiting payment": "ክፍያ በመጠባበቅ ላይ", "Removed": "ተወግዷል",
    "transaction number is": "የግብይት ቁጥሩ", "↑ Copy this code into the box below": "↑ ይህን ኮድ ከታች ባለው ሳጥን ውስጥ ያስገቡ",
    "Checking your payment": "ክፍያዎን በማጣራት ላይ", "seconds": "ሰከንድ", "We’re matching transaction": "የግብይት ቁጥር",
    "with telebirr. This usually takes under 30 seconds — keep this page open.": "ከቴሌብር ጋር እየተመሳከረ ነው። ብዙውን ጊዜ ከ30 ሰከንድ በታች ይወስዳል — ይህን ገጽ ክፍት ያድርጉት።",
    "Taking a little longer": "ትንሽ ጊዜ እየወሰደ ነው", "We’ll help you finish it.": "እንዲጨርሱ እናግዝዎታለን።",
    "Call or text us and mention order": "ይደውሉልን ወይም መልዕክት ይላኩልን፤ የትዕዛዝ ቁጥር",
    ". We’ll confirm your payment and unlock your certificate. This page also unlocks by itself the moment it’s confirmed.": "ን ይጥቀሱ። ክፍያዎን አረጋግጠን ሰርተፊኬትዎን እንከፍታለን። ልክ እንደተረጋገጠ ይህ ገጽም በራሱ ይከፈታል።",
    "CALL 0996 567 218": "ይደውሉ 0996 567 218", "SEND SMS": "SMS ይላኩ", "Payment not confirmed": "ክፍያው አልተረጋገጠም", "Paid": "ተከፍሏል", "Loading": "በመጫን ላይ", "Not found": "አልተገኘም",
    "Verifying payment ·": "ክፍያን በማረጋገጥ ላይ ·", "Finding your telebirr receipt": "የቴሌብር ደረሰኝዎን በመፈለግ ላይ",
    "Confirming the payment": "ክፍያውን በማረጋገጥ ላይ", "Registry entry created": "የመዝገብ ግቤት ተፈጥሯል", "Certificate issued": "ሰርተፊኬት ተሰጥቷል",
    "Number copied.": "ቁጥሩ ተቀድቷል።", "Order link copied.": "የትዕዛዝ ሊንኩ ተቀድቷል።",
    "Enter the transaction number from your telebirr SMS.": "ከቴሌብር SMS የግብይት ቁጥሩን ያስገቡ።",
    "This link is incomplete.": "ይህ ሊንክ ያልተሟላ ነው።", "Network error — check your connection and try again.": "የኔትወርክ ችግር — ግንኙነትዎን አረጋግጠው እንደገና ይሞክሩ።",
    /* server messages */
    "That doesn’t look like a telebirr transaction ID. It’s the 10-character code in your SMS, e.g. AB12CD34EF.": "ይህ የቴሌብር የግብይት ቁጥር አይመስልም። በSMS ውስጥ ያለው ባለ 10 ሆሄ ኮድ ነው፣ ለምሳሌ AB12CD34EF።",
    "This transaction ID has already been used for another order.": "ይህ የግብይት ቁጥር ለሌላ ትዕዛዝ ጥቅም ላይ ውሏል።",
    "Too many attempts. Please contact us.": "በጣም ብዙ ሙከራዎች። እባክዎ ያግኙን።", "Order not found.": "ትዕዛዙ አልተገኘም።",
    "Add a recipient and your name.": "የተቀባዩን ስምና የእርስዎን ስም ያስገቡ።", "Unknown Dinguy.": "ያልታወቀ ድንጋይ።",
    "Too many orders from this connection. Try again later.": "ከዚህ ግንኙነት ብዙ ትዕዛዞች ተልከዋል። ቆይተው እንደገና ይሞክሩ።",
    "Something went wrong. Please try again.": "የሆነ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።", "Please try again.": "እባክዎ እንደገና ይሞክሩ።",
    "We could not confirm this payment.": "ይህን ክፍያ ማረጋገጥ አልቻልንም።",
    "We could not confirm this payment. Please contact us.": "ይህን ክፍያ ማረጋገጥ አልቻልንም። እባክዎ ያግኙን።",

    /* ---------- success / record / registry ---------- */
    "Registry entry confirmed ·": "የመዝገብ ግቤት ተረጋግጧል ·", "IT'S OFFICIAL.": "ይፋ ሆኗል።", "Well, officially enough.": "እሺ፣ በቂ ያህል ይፋ።",
    "has been registered with:": "የተመዘገበለት ድንጋይ፦", "Registration No.": "የምዝገባ ቁ.", "Your certificate is ready.": "ሰርተፊኬትዎ ዝግጁ ነው።",
    "DOWNLOAD CERTIFICATE": "ሰርተፊኬቱን አውርድ", "SAVE CERTIFICATE": "ሰርተፊኬቱን አስቀምጥ",
    "Tip: after tapping Save, choose “Save Image” to keep it in your Photos.": "ምክር፦ “አስቀምጥ”ን ከነኩ በኋላ በፎቶዎችዎ ውስጥ ለማስቀመጥ “Save Image”ን ይምረጡ።", "VIEW REGISTRY PAGE": "የመዝገብ ገጹን ተመልከት", "SHARE WITH THEM": "ለእነሱ አጋራ",
    "Experience archived.": "ልምዱ ተመዝግቧል።", "One more entry was found in the registry.": "በመዝገቡ ውስጥ አንድ ተጨማሪ ግቤት ተገኝቷል።",
    "OPEN FINAL RECORD": "የመጨረሻውን መዝገብ ክፈት", "DINGUY Registration Office": "የDINGUY ምዝገባ ቢሮ", "Public record": "የሕዝብ መዝገብ",
    "OFFICIAL REGISTRY RECORD": "ይፋዊ የመዝገብ ሰነድ", "Registered specimen": "የተመዘገበ ናሙና", "Registration Number": "የምዝገባ ቁጥር",
    "Dedication": "መታሰቢያ ቃል", "Registration status": "የምዝገባ ሁኔታ", "Registration type": "የምዝገባ ዓይነት",
    "Symbolic digital registration": "ምሳሌያዊ ዲጂታል ምዝገባ", "Physical stone": "አካላዊ ድንጋይ", "Not included": "አይካተትም",
    "Tap to expand certificate": "ሰርተፊኬቱን ለማስፋት ይንኩ", "Expand certificate": "ሰርተፊኬቱን አስፋ", "Certificate": "ሰርተፊኬት",
    "BUY YOUR OWN STONE": "የራስዎን ድንጋይ ይግዙ", "One more entry was found →": "አንድ ተጨማሪ ግቤት ተገኝቷል →", "SEND TO THEM": "ላክላቸው",
    "Registered To": "የተመዘገበለት", "Dinguy Type": "የድንጋይ ዓይነት", "Registered On": "የተመዘገበበት ቀን", "Occasion": "አጋጣሚ",
    "Registry link copied.": "የመዝገብ ሊንኩ ተቀድቷል።", "Certificate downloaded.": "ሰርተፊኬቱ ወርዷል።",
    "DINGUY Registration Office · Searching records": "የDINGUY ምዝገባ ቢሮ · መዝገቦችን በመፈለግ ላይ",
    "Every registered Dinguy has a permanent public record. Enter a registration number to view it.": "እያንዳንዱ የተመዘገበ ድንጋይ ቋሚ የሕዝብ መዝገብ አለው። ለማየት የምዝገባ ቁጥሩን ያስገቡ።",
    "Registration number": "የምዝገባ ቁጥር", "VIEW REGISTRY": "መዝገቡን ተመልከት", "Recent entries": "የቅርብ ጊዜ ግቤቶች",
    "not found": "አልተገኘም", "Error 404 ·": "ስህተት 404 ·", "THIS DINGUY DOES NOT EXIST.": "ይህ ድንጋይ የለም።",
    "At least not in our registry.": "ቢያንስ በእኛ መዝገብ ውስጥ።", "GO HOME": "ወደ መነሻ ገጽ",

    /* ---------- certificate component + canvas ---------- */
    "Unofficial DINGUY Registration Office": "ይፋዊ ያልሆነ የDINGUY ምዝገባ ቢሮ", "UNOFFICIAL DINGUY REGISTRATION OFFICE": "ይፋዊ ያልሆነ የDINGUY ምዝገባ ቢሮ",
    "Certificate of Dinguy Registration": "የድንጋይ ምዝገባ ሰርተፊኬት", "CERTIFICATE OF DINGUY REGISTRATION": "የድንጋይ ምዝገባ ሰርተፊኬት",
    "This certifies that": "ይህ ሰርተፊኬት የሚያረጋግጠው",
    "has been assigned and ceremonially registered with": "በሥነ-ሥርዓት የተመዘገበለት ድንጋይ፦",
    "under the DINGUY Registry.": "በDINGUY መዝገብ ስር መሆኑን ነው።",
    "Dedicated by": "ያበረከተው", "Date of Registration": "የምዝገባ ቀን",
    "REGISTRATION NO.": "የምዝገባ ቁ.", "DEDICATED BY": "ያበረከተው", "OCCASION": "አጋጣሚ", "DATE OF REGISTRATION": "የምዝገባ ቀን",
    "This certificate records a symbolic digital registration only. It does not represent ownership of a physical stone or any legal, scientific, mineralogical or property right.": "ይህ ሰርተፊኬት ምሳሌያዊ ዲጂታል ምዝገባን ብቻ ይመዘግባል። የአካላዊ ድንጋይ ባለቤትነትን ወይም ማንኛውንም ሕጋዊ፣ ሳይንሳዊ፣ የማዕድን ወይም የንብረት መብትን አይወክልም።",
    "DG Registry": "DG መዝገብ", "DG REGISTRY": "DG መዝገብ", "Registered": "ተመዝግቧል",
    "“Your dedication will appear here.”": "“መታሰቢያ ቃልዎ እዚህ ይታያል።”",
    "SPECIMEN": "ናሙና", "REGISTERED": "ተመዝግቧል", "ACTIVE": "ንቁ", "SYMBOLIC": "ምሳሌያዊ", "DEDICATION": "መታሰቢያ",
    "CERTIFIED HEAVY": "የተረጋገጠ ከባድ", "OFFICIAL": "ይፋዊ", "ARCHIVE": "ማህደር", "STATUS": "ሁኔታ", "PENDING": "በመጠባበቅ ላይ",
    "CLASS II": "ደረጃ II", "RECORD": "መዝገብ",
    "Specimen disturbed. Please stop.": "ናሙናው ተረብሿል። እባክዎ ያቁሙ።",
    "Cobblestone specimen": "የኮብልስቶን ናሙና", "Concrete block specimen": "የብሎኬት ናሙና", "River stone specimen": "የወንዝ ድንጋይ ናሙና",
    "Foundation stone specimen": "የመሰረት ድንጋይ ናሙና", "Opal specimen": "የኦፓል ናሙና", "Chocolate opal specimen": "የቸኮሌት ኦፓል ናሙና",
    "Emerald specimen": "የኤመራልድ ናሙና", "Diamond specimen": "የአልማዝ ናሙና", "Stone specimen": "የድንጋይ ናሙና",

    /* ---------- FAQ ---------- */
    "Registry Office · Enquiries": "የመዝገብ ቢሮ · ጥያቄዎች",
    "Is DINGUY a real stone registry?": "DINGUY እውነተኛ የድንጋይ መዝገብ ነው?",
    "DINGUY is a private, unofficial digital registration experience created for symbolic gifting and entertainment.": "DINGUY ለምሳሌያዊ ስጦታና ለመዝናኛ የተፈጠረ የግል፣ ይፋዊ ያልሆነ ዲጂታል የምዝገባ ልምድ ነው።",
    "Do I receive a physical stone?": "አካላዊ ድንጋይ ይደርሰኛል?",
    "No. DINGUY registrations are entirely digital. No physical stone is shipped.": "አይ። የDINGUY ምዝገባዎች ሙሉ በሙሉ ዲጂታል ናቸው። ምንም አካላዊ ድንጋይ አይላክም።",
    "Do I own the stone?": "የድንጋዩ ባለቤት እሆናለሁ?",
    "No. Your registration does not grant ownership of any physical stone, mineral, gemstone, land or other property.": "አይ። ምዝገባዎ የማንኛውንም አካላዊ ድንጋይ፣ ማዕድን፣ የከበረ ድንጋይ፣ መሬት ወይም ሌላ ንብረት ባለቤትነት አይሰጥም።",
    "What do I actually receive?": "በእርግጥ ምን አገኛለሁ?",
    "You receive a professionally designed digital certificate and a personal registry page with a unique registration number.": "በባለሙያ የተዘጋጀ ዲጂታል ሰርተፊኬትና ልዩ የምዝገባ ቁጥር ያለው የግል የመዝገብ ገጽ ያገኛሉ።",
    "Can I send it to someone?": "ለሌላ ሰው መላክ እችላለሁ?",
    "Yes. Every registration has a shareable registry link, and the certificate can be downloaded and sent to the recipient.": "አዎ። እያንዳንዱ ምዝገባ ሊጋራ የሚችል የመዝገብ ሊንክ አለው፤ ሰርተፊኬቱም ወርዶ ለተቀባዩ መላክ ይችላል።",
    "Can I choose the name?": "ስሙን መምረጥ እችላለሁ?",
    "Yes. You can register it to anyone you choose, subject to our terms.": "አዎ። በውሎቻችን መሰረት ለመረጡት ማንኛውም ሰው ማስመዝገብ ይችላሉ።",
    "Can I write my own message?": "የራሴን መልዕክት መጻፍ እችላለሁ?",
    "Yes. You can write your own dedication or use one of our suggestions.": "አዎ። የራስዎን መታሰቢያ ቃል መጻፍ ወይም ከምክሮቻችን አንዱን መጠቀም ይችላሉ።",
    "Is this similar to naming a star?": "ይህ ኮከብን በስም ከመሰየም ጋር ይመሳሰላል?",
    "The idea is similar in the sense that it creates a symbolic personal registration for a gift. DINGUY makes no claim to officially name or transfer ownership of a physical object.": "ሀሳቡ ለስጦታ የሚሆን ምሳሌያዊ የግል ምዝገባ በመፍጠሩ ይመሳሰላል። DINGUY አካላዊ ነገርን በይፋ እሰይማለሁ ወይም ባለቤትነትን አስተላልፋለሁ አይልም።",
    "Is DINGUY associated with an astronomical organization or geological authority?": "DINGUY ከሥነ-ፈለክ ድርጅት ወይም ከጂኦሎጂ ባለሥልጣን ጋር ግንኙነት አለው?",
    "No. DINGUY is an independent private service.": "አይ። DINGUY ራሱን የቻለ የግል አገልግሎት ነው።",
    "Can I get a refund?": "ገንዘቤን መመለስ እችላለሁ?",
    "Please see our Terms & Conditions for our refund and cancellation policy.": "ስለ ገንዘብ ተመላሽና ስረዛ ፖሊሲያችን እባክዎ ውሎችና ሁኔታዎቻችንን ይመልከቱ።",

    /* ---------- terms ---------- */
    "Last updated: 30 September 2026": "ለመጨረሻ ጊዜ የተሻሻለው፦ 30 ሴፕቴምበር 2026",
    "DINGUY REGISTRATION TERMS": "የDINGUY ምዝገባ ውሎች",
    "No physical stone, land, mineral deposit, gemstone, or other tangible property is included or transferred.": "ምንም አካላዊ ድንጋይ፣ መሬት፣ የማዕድን ክምችት፣ የከበረ ድንጋይ ወይም ሌላ ተጨባጭ ንብረት አይካተትም ወይም አይተላለፍም።",
    "What DINGUY provides": "DINGUY የሚሰጠው",
    "DINGUY provides a digital, symbolic registration and certificate service intended primarily for gifting, entertainment and personal expression.": "DINGUY በዋናነት ለስጦታ፣ ለመዝናኛና ለግል ስሜት መግለጫ የታሰበ ዲጂታል፣ ምሳሌያዊ የምዝገባና የሰርተፊኬት አገልግሎት ይሰጣል።",
    "A completed registration creates a record within the private DINGUY Registry and generates a digital certificate.": "የተጠናቀቀ ምዝገባ በግል የDINGUY መዝገብ ውስጥ መዝገብ ይፈጥራል፤ ዲጂታል ሰርተፊኬትም ያዘጋጃል።",
    "No physical stone is sold": "አካላዊ ድንጋይ አይሸጥም",
    "DINGUY does not sell, ship, assign or transfer ownership of a physical stone, gemstone, mineral, land or geological specimen through its digital registration service.": "DINGUY በዲጂታል የምዝገባ አገልግሎቱ አማካኝነት የአካላዊ ድንጋይ፣ የከበረ ድንጋይ፣ የማዕድን፣ የመሬት ወይም የጂኦሎጂ ናሙና ባለቤትነትን አይሸጥም፣ አይልክም፣ አይሰጥም ወይም አያስተላልፍም።",
    "Purchasing a DINGUY registration does not entitle the purchaser or recipient to receive a physical object.": "የDINGUY ምዝገባ መግዛት ገዢውን ወይም ተቀባዩን አካላዊ ነገር እንዲቀበል መብት አይሰጠውም።",
    "No official ownership or naming rights": "ይፋዊ የባለቤትነት ወይም የስያሜ መብት የለም",
    "A DINGUY registration is not an official scientific, geological, mineralogical, governmental or property registration.": "የDINGUY ምዝገባ ይፋዊ ሳይንሳዊ፣ የጂኦሎጂ፣ የማዕድን፣ የመንግሥት ወይም የንብረት ምዝገባ አይደለም።",
    "The registration does not establish ownership, possession, title, extraction rights, intellectual property rights or any other legal interest in a physical stone or geological material.": "ምዝገባው በአካላዊ ድንጋይ ወይም በጂኦሎጂ ቁሳቁስ ላይ ባለቤትነትን፣ ይዞታን፣ የባለቤትነት ማረጋገጫን፣ የማውጣት መብትን፣ የአእምሮ ንብረት መብትን ወይም ሌላ ማንኛውንም ሕጋዊ ጥቅም አያቋቁምም።",
    "Private registry": "የግል መዝገብ",
    "The DINGUY Registry is a privately operated database.": "የDINGUY መዝገብ በግል የሚተዳደር የመረጃ ቋት ነው።",
    "Registration numbers and certificates are issued by DINGUY and have no official status outside the DINGUY service.": "የምዝገባ ቁጥሮችና ሰርተፊኬቶች በDINGUY የሚሰጡ ሲሆን ከDINGUY አገልግሎት ውጪ ይፋዊ ደረጃ የላቸውም።",
    "Digital delivery": "ዲጂታል አቅርቦት", "The product is delivered digitally.": "ምርቱ በዲጂታል መንገድ ይደርሳል።",
    "After registration and successful payment, the customer receives access to a downloadable digital certificate and a shareable registry page.": "ከምዝገባና ከተሳካ ክፍያ በኋላ ደንበኛው ሊወርድ የሚችል ዲጂታል ሰርተፊኬትና ሊጋራ የሚችል የመዝገብ ገጽ ያገኛል።",
    "Personal messages": "የግል መልዕክቶች",
    "Customers are responsible for the messages and names they submit.": "ደንበኞች ለሚያስገቡት መልዕክትና ስም ኃላፊነት አለባቸው።",
    "DINGUY reserves the right to reject or remove content that is unlawful, abusive, threatening, defamatory or otherwise inappropriate.": "DINGUY ሕገ-ወጥ፣ ተሳዳቢ፣ አስፈራሪ፣ ስም አጥፊ ወይም በሌላ መንገድ አግባብ ያልሆነ ይዘትን የመከልከል ወይም የማስወገድ መብት አለው።",
    "Accuracy": "ትክክለኛነት",
    "DINGUY does not guarantee that any symbolic description, classification or creative designation represents a scientific classification of a physical stone.": "DINGUY ማንኛውም ምሳሌያዊ መግለጫ፣ ምደባ ወይም የፈጠራ ስያሜ የአካላዊ ድንጋይን ሳይንሳዊ ምደባ እንደሚወክል ዋስትና አይሰጥም።",
    "Any geological or gemstone references used on the website are presented for descriptive and creative purposes and do not constitute a gemological certification.": "በድረ-ገጹ ላይ የተጠቀሱ የጂኦሎጂ ወይም የከበሩ ድንጋዮች ማጣቀሻዎች ለመግለጫና ለፈጠራ ዓላማ የቀረቡ ሲሆን የከበሩ ድንጋዮች ማረጋገጫ አይደሉም።",
    "Entertainment and gifting": "መዝናኛና ስጦታ",
    "DINGUY is intended as a symbolic gift and entertainment experience.": "DINGUY እንደ ምሳሌያዊ ስጦታና የመዝናኛ ልምድ የታሰበ ነው።",
    "By purchasing a registration, the customer acknowledges the nature of the service described above.": "ምዝገባ በመግዛት ደንበኛው ከላይ የተገለጸውን የአገልግሎቱን ባህሪ ይቀበላል።",
    "Changes": "ለውጦች",
    "DINGUY may update its registry, website, products, pricing and terms from time to time.": "DINGUY መዝገቡን፣ ድረ-ገጹን፣ ምርቶቹን፣ ዋጋውንና ውሎቹን ከጊዜ ወደ ጊዜ ሊያሻሽል ይችላል።",

    /* ---------- SIDEWAYS ---------- */
    "INDEPENDENT CREATIVE COMPANY": "ራሱን የቻለ የፈጠራ ድርጅት", "YOU'VE FOUND": "እንኳን ወደ", "SIDEWAYS.": "SIDEWAYS መጡ።",
    "Ideas that make people stop, look twice and remember.": "ሰዎች ቆም ብለው፣ ደግመው አይተው እንዲያስታውሱ የሚያደርጉ ሀሳቦች።",
    "DINGUY is one of them.": "DINGUY ከነዚህ አንዱ ነው።",
    "WEBSITES ✦": "ድረ-ገጾች ✦", "CAMPAIGNS ✦": "ዘመቻዎች ✦", "GUERRILLA ✦": "ጉሬላ ✦", "INTERNET THINGS ✦": "የኢንተርኔት ነገሮች ✦",
    "STOP ✦": "ቁም ✦", "LOOK TWICE ✦": "ደግመህ እይ ✦", "REMEMBER ✦": "አስታውስ ✦",
    "01 — WEBSITES": "01 — ድረ-ገጾች", "02 — IDEAS": "02 — ሀሳቦች", "03 — TALK": "03 — እናውራ",
    "DO MY WEBSITE TOO": "የኔንም ድረ-ገጽ ስሩልኝ", "From 45,000 ETB": "ከ45,000 ብር ጀምሮ", "LOOK": "ደግመህ", "TWICE": "እይ",
    "GUERRILLA MARKETING": "ጉሬላ ማርኬቲንግ", "Make people wonder what they just found.": "ሰዎች ምን እንዳገኙ እንዲገረሙ ያድርጉ።",
    "Got a strange idea?": "እንግዳ ሀሳብ አለዎት?", "Let’s make people talk.": "ሰዎችን እናስወራ።", "CONTACT SIDEWAYS": "SIDEWAYSን ያግኙ",
    "CASE 001": "ስራ 001", "A registry for stones. You just used it. Back to the registry →": "የድንጋዮች መዝገብ። አሁን ተጠቅመውበታል። ወደ መዝገቡ ይመለሱ →",
    "WE LIKE THE": "እኛ", "OTHER": "ሌላውን", "DIRECTION.": "አቅጣጫ እንወዳለን።",
    "SIDEWAYS is an independent creative company making brands, digital experiences, campaigns and internet things.": "SIDEWAYS ብራንዶችን፣ ዲጂታል ልምዶችን፣ ዘመቻዎችንና የኢንተርኔት ነገሮችን የሚሰራ ራሱን የቻለ የፈጠራ ድርጅት ነው።",
    "We work across ideas, design, technology and culture.": "በሀሳብ፣ በዲዛይን፣ በቴክኖሎጂና በባህል ዙሪያ እንሰራለን።",
    "Sometimes the most effective way to make someone remember a brand is to give them something they weren't expecting.": "አንዳንድ ጊዜ አንድ ሰው ብራንድን እንዲያስታውስ ለማድረግ ውጤታማው መንገድ ያልጠበቀውን ነገር መስጠት ነው።",
    "DINGUY is a good example.": "DINGUY ጥሩ ምሳሌ ነው።",
    "A good website shouldn't just exist.": "ጥሩ ድረ-ገጽ ዝም ብሎ መኖር የለበትም።", "It should do something.": "አንድ ነገር መስራት አለበት።",
    "SUITABLE FOR": "የሚስማማው ለ", "START WITH": "ጀምር፦", "EVERY PROJECT IS DIFFERENT.": "እያንዳንዱ ፕሮጀክት የተለየ ነው።",
    "Final pricing depends on the complexity, content, functionality and experience required.": "የመጨረሻው ዋጋ በሚፈለገው ውስብስብነት፣ ይዘት፣ ተግባርና ልምድ ይወሰናል።",
    "START A PROJECT": "ፕሮጀክት እንጀምር", "SENDING…": "በመላክ ላይ…",
    "STARTER": "መነሻ", "STANDARD": "መደበኛ", "EXPERIENCE": "ልምድ",
    "45,000 ETB": "45,000 ብር", "85,000 ETB": "85,000 ብር", "135,000 ETB": "135,000 ብር",
    "For straightforward websites with a clear purpose.": "ግልጽ ዓላማ ላላቸው ቀላል ድረ-ገጾች።",
    "For businesses that need more than a few pages.": "ከጥቂት ገጾች በላይ ለሚያስፈልጋቸው ንግዶች።",
    "For websites that need a proper digital experience.": "ሙሉ ዲጂታል ልምድ ለሚያስፈልጋቸው ድረ-ገጾች።",
    "Portfolio websites": "የስራ ማሳያ ድረ-ገጾች", "Personal brands": "የግል ብራንዶች", "Small businesses": "አነስተኛ ንግዶች",
    "Simple company websites": "ቀላል የድርጅት ድረ-ገጾች", "Growing businesses": "እያደጉ ያሉ ንግዶች", "Service companies": "የአገልግሎት ድርጅቶች",
    "Professional brands": "ፕሮፌሽናል ብራንዶች", "Custom content structures": "ልዩ የይዘት አወቃቀሮች", "More advanced interactions": "የላቁ መስተጋብሮች",
    "Custom brand experiences": "ልዩ የብራንድ ልምዶች", "Complex websites": "ውስብስብ ድረ-ገጾች", "Interactive experiences": "በይነተገናኝ ልምዶች",
    "Campaign websites": "የዘመቻ ድረ-ገጾች", "Unusual ideas": "ያልተለመዱ ሀሳቦች",
    "MAKE PEOPLE WONDER WHAT THEY JUST FOUND.": "ሰዎች ምን እንዳገኙ እንዲገረሙ ያድርጉ።",
    "We develop unconventional digital ideas designed to generate attention.": "ትኩረት ለመሳብ የተነደፉ ያልተለመዱ ዲጂታል ሀሳቦችን እናዘጋጃለን።",
    "WHAT WE BUILD": "የምንሰራቸው", "A registry for stones. You just used it.": "የድንጋዮች መዝገብ። አሁን ተጠቅመውበታል።", "CONTACT US": "ያግኙን",
    "A strange website.": "እንግዳ ድረ-ገጽ።", "A fake institution.": "ሀሰተኛ ተቋም።", "A product nobody expected.": "ማንም ያልጠበቀው ምርት።",
    "A campaign that becomes a conversation.": "መነጋገሪያ የሚሆን ዘመቻ።",
    "Strange websites": "እንግዳ ድረ-ገጾች", "Fake institutions": "ሀሰተኛ ተቋማት", "Unexpected products": "ያልተጠበቁ ምርቶች",
    "Campaigns": "ዘመቻዎች", "Public stunts": "ሕዝባዊ ትርኢቶች", "Interactive experiments": "በይነተገናኝ ሙከራዎች",
    "Digital experiences designed for attention": "ትኩረት ለመሳብ የተነደፉ ዲጂታል ልምዶች",
    "MAKE PEOPLE TALK.": "ሰዎችን እናስወራ።", "PHONE": "ስልክ", "EMAIL": "ኢሜይል", "NAME": "ስም", "EMAIL OR PHONE": "ኢሜይል ወይም ስልክ",
    "WHAT DO YOU NEED?": "ምን ይፈልጋሉ?", "TELL US ABOUT IT": "ስለሱ ይንገሩን", "RECEIVED": "ደርሶናል",
    "Thanks,": "እናመሰግናለን፣", ". We'll get back to you.": "። በቅርቡ እናገኝዎታለን።",
    "Website": "ድረ-ገጽ", "Guerrilla marketing": "ጉሬላ ማርኬቲንግ", "Something unusual": "ያልተለመደ ነገር",
    "Add your name and a phone number or email.": "ስምዎንና ስልክ ቁጥር ወይም ኢሜይል ያስገቡ።",
    "Too many messages. Please call or email us instead.": "በጣም ብዙ መልዕክቶች። እባክዎ በምትኩ ይደውሉ ወይም ኢሜይል ይላኩ።",
    "Something went wrong. Please call or email us instead.": "የሆነ ችግር ተፈጥሯል። እባክዎ በምትኩ ይደውሉ ወይም ኢሜይል ይላኩ።"
  };

  var MONTHS = { January: 'ጃንዋሪ', February: 'ፌብሩዋሪ', March: 'ማርች', April: 'ኤፕሪል', May: 'ሜይ', June: 'ጁን', July: 'ጁላይ', August: 'ኦገስት', September: 'ሴፕቴምበር', October: 'ኦክቶበር', November: 'ኖቬምበር', December: 'ዲሴምበር' };
  var RULES = [
    [/^Registry open · (\d+) entries$/, function (m) { return 'መዝገቡ ክፍት ነው · ' + m[1] + ' ምዝገባዎች'; }],
    [/^Depth (\d+) m$/, function (m) { return 'ጥልቀት ' + m[1] + ' ሜ'; }],
    [/^(\d{1,2}) (January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})$/, function (m) { return m[1] + ' ' + MONTHS[m[2]] + ' ' + m[3]; }],
    [/^We couldn't find telebirr transaction ([A-Z0-9]+)\. Check the transaction number in your telebirr SMS and enter it again\.$/, function (m) { return 'የቴሌብር ግብይት ' + m[1] + ' አልተገኘም። በቴሌብር SMS ውስጥ ያለውን የግብይት ቁጥር አረጋግጠው እንደገና ያስገቡ።'; }],
    [/^Transaction ([A-Z0-9]+) wasn't sent to DINGUY\. Send (\d+) Birr to ([\d ]+?)(?: \((.+)\))? and enter the new transaction number\.$/, function (m) { return 'ግብይት ' + m[1] + ' ወደ DINGUY አልተላከም። ' + m[2] + ' ብር ወደ ' + m[3] + (m[4] ? ' (' + m[4] + ')' : '') + ' ልከው አዲሱን የግብይት ቁጥር ያስገቡ።'; }],
    [/^That payment was not sent to DINGUY \((\d+)\)\.$/, function (m) { return 'ይህ ክፍያ ወደ DINGUY (' + m[1] + ') አልተላከም።'; }],
    [/^(.+) has been registered with (.+)\. Registration No\. (DG-\d+)$/, function (m) { return m[1] + ' በ' + tr(m[2]) + ' ተመዝግቧል። የምዝገባ ቁ. ' + m[3]; }]
  ];

  function tr(s) {
    if (lang !== 'am' || !s) return s;
    var t = s.trim();
    if (!t) return s;
    var v = Object.prototype.hasOwnProperty.call(AM, t) ? AM[t] : undefined;
    if (v === undefined) {
      for (var i = 0; i < RULES.length; i++) { var m = RULES[i][0].exec(t); if (m) { v = RULES[i][1](m); break; } }
    }
    if (v === undefined) return s;
    return s.slice(0, s.length - s.trimStart().length) + v + s.slice(s.trimEnd().length);
  }

  window.dgLang = {
    lang: lang,
    t: tr,
    set: function (l) { save(l); location.reload(); }
  };

  /* ---------- live translation of the rendered page ---------- */
  var ATTRS = ['placeholder', 'aria-label', 'title'];
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, 'X-DC': 1, NOSCRIPT: 1 };
  function doText(n) {
    var p = n.parentNode; if (p && SKIP[p.nodeName]) return;
    var v = n.nodeValue, t = tr(v); if (t === v) return;
    n.nodeValue = t;
    // English words with no Amharic counterpart ("A") become empty: hide their word box so no gap is left.
    if (!t.trim() && p && p.nodeType === 1 && p.childNodes.length === 1) {
      p.style.display = 'none';
      var o = p.parentElement;
      if (o && o.children.length === 1 && !o.textContent.trim()) o.style.display = 'none';
    }
  }
  function doEl(el) { for (var i = 0; i < ATTRS.length; i++) { var a = ATTRS[i]; if (el.hasAttribute && el.hasAttribute(a)) { var v = el.getAttribute(a), t = tr(v); if (t !== v) el.setAttribute(a, t); } } }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    if (SKIP[root.nodeName]) { if (root.nodeName === 'TEXTAREA') doEl(root); return; }
    doEl(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (n) {
        if (n.nodeType === 1 && SKIP[n.nodeName]) { if (n.nodeName === 'TEXTAREA') doEl(n); return NodeFilter.FILTER_REJECT; }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n; while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
  }
  function startTranslating() {
    document.documentElement.lang = 'am';
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes') doEl(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    if (document.body) walk(document.body);
    else document.addEventListener('DOMContentLoaded', function () { walk(document.body); });
  }
  if (lang === 'am') startTranslating();

  /* ---------- first-visit language chooser ---------- */
  function chooser() {
    if (stored()) return;
    var css = document.createElement('style');
    css.textContent = '@keyframes dgl-in{from{opacity:0;transform:translate3d(-50%,16px,0)}to{opacity:1;transform:translate3d(-50%,0,0)}}' +
      '#dg-lang{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));z-index:150;width:min(calc(100vw - 24px),380px);transform:translate3d(-50%,0,0);' +
      'background:rgba(11,23,32,.94);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);color:#eef2f4;border:1px solid rgba(238,242,244,.2);' +
      'box-shadow:0 24px 60px -20px rgba(0,0,0,.7);padding:16px;font-family:"Helvetica Neue",Helvetica,Arial,"Noto Sans Ethiopic",sans-serif;animation:dgl-in .45s cubic-bezier(.2,.8,.2,1) both}' +
      '#dg-lang .k{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#a9bccb}' +
      '#dg-lang .q{margin:6px 0 12px;font-size:18px;font-weight:600;letter-spacing:-.01em}' +
      '#dg-lang .r{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
      '#dg-lang button{min-height:48px;border:1px solid rgba(238,242,244,.35);background:transparent;color:#eef2f4;font:inherit;font-size:15px;font-weight:600;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
      '#dg-lang button.on{background:#eef2f4;color:#0b1720;border-color:#eef2f4}';
    document.head.appendChild(css);
    var box = document.createElement('div');
    box.id = 'dg-lang'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Language / ቋንቋ');
    box.innerHTML = '<div class="k">Language · ቋንቋ</div><div class="q">Choose your language · ቋንቋ ይምረጡ</div>' +
      '<div class="r"><button type="button" class="on" data-l="en">English</button><button type="button" data-l="am">አማርኛ</button></div>';
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.getAttribute('data-l') === 'am') { window.dgLang.set('am'); return; }
      save('en'); box.remove();
    });
    document.body.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(chooser, 600); });
  else setTimeout(chooser, 600);
})();
