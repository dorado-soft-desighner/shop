# POS System Architecture Instructions (Decoupled Frontend & Backend)

මෙම උපදෙස් මාලාව සකස් කර ඇත්තේ පරිශීලකයින්ට සහ පරිපාලකයින්ට (Admin) වෙන වෙනම ආරක්ෂිතව පද්ධතියට ඇතුළු විය හැකි (Separate Login Mechanisms) පරිදි Frontend සහ Backend වෙන් වෙන්ව ගොඩනැගීම සඳහායි.

---

## 1. තාක්ෂණික ක්‍රමවේදය තෝරාගැනීම (Technology Stack Options)

සම්පූර්ණ පද්ධතිය ස්වාධීන කොටස් දෙකකින් සමන්විත වේ:

*   **Frontend (User Interface):** පරිශීලකයාට පෙනෙන සහ ක්‍රියා කරවන කොටස.
    *   *නිර්දේශිත තාක්ෂණයන්:* React.js, Vue.js, හෝ HTML/CSS/JavaScript.
*   **Backend (API & Logic):** දත්ත සැකසීම, දත්තගබඩාව පාලනය සහ ආරක්ෂාව පවත්වා ගන්නා කොටස.
    *   *නිර්දේශිත තාක්ෂණයන්:* Node.js (Express), Python (Django/FastAPI), හෝ PHP.
*   **Database:** දත්ත ගබඩාව.
    *   *නිර්දේශිත තාක්ෂණයන්:* PostgreSQL, MySQL, හෝ MongoDB.

---

## 2. ලොගින් පද්ධතියේ ව්‍යුහය (Separate Login Architecture)

Frontend සහ Backend වෙන වෙනම ක්‍රියාත්මක වන විට ආරක්ෂාව තහවුරු කරන්නේ **JWT (JSON Web Tokens)** හෝ **Session Cookies** භාවිතයෙනි.

### A. Frontend (Client-Side) ක්‍රියාවලිය
1.  **වෙනස් පිවිසුම් පිටු (Separate Login Routes):**
    *   `/login` : සාමාන්‍ය සේවකයින්ට හෝ මුදල් අයකැමියන්ට (Cashier Interface).
    *   `/admin/login` : ව්‍යාපාරයේ හිමිකරුට හෝ කළමනාකරුට (Admin Dashboard).
2.  **Authentication Request:** පරිශීලකයා ඇතුළත් කරන Username සහ Password, Backend API එක වෙත (Secure HTTPS ඔස්සේ) යොමු කිරීම.
3.  **Token Storage:** Backend එකෙන් සාර්ථකව Login වූ බවට ලැබෙන JWT Token එක Frontend එකෙහි (Browser LocalStorage හෝ HttpOnly Cookie එකක) සුරක්ෂිතව තබා ගැනීම.

### B. Backend (Server-Side) ක්‍රියාවලිය
1.  **User Roles අර්ථ දැක්වීම:** දත්තගබඩාවේ පරිශීලක වගුව (User Table) තුළ භූමිකාවන් (Roles) වෙන් කරන්න (උදා: `role: "cashier"` හෝ `role: "admin"`).
2.  **API Endpoints වෙන් කිරීම:**
    *   `/api/auth/login` : පොදු පිවිසුම් ද්වාරය.
    *   `/api/admin/*` : ආරක්ෂිත පරිපාලන ද්වාර (Admin Middleware මගින් ආරක්ෂා කර ඇත).
3.  **Role-Based Access Control (RBAC):** Token එකක් ලැබුණු විට, එම පරිශීලකයාට අදාළ දත්ත ලබා ගැනීමට අවසර (Permissions) තිබේදැයි පරීක්ෂා කරන Middleware එකක් Backend එක තුළ ක්‍රියාත්මක කිරීම.

---

## 3. පියවරෙන් පියවර සංවර්ධන උපදෙස් (Step-by-Step Development)

### පියවර 1: දත්තගබඩාව සහ Backend එක සැකසීම
*   පරිශීලකයින්ගේ මුරපද (Passwords) ඍජුවම ගබඩා නොකර **bcrypt** වැනි ක්‍රමවේදයකින් Hash කර සුරකින්න.
*   පරිශීලකයාගේ Role එක අනුව (Admin/Cashier) දත්ත නිකුත් කරන API සාදන්න.

### පියවර 2: Frontend අතුරුමුහුණත් දෙක නිර්මාණය කිරීම
*   **Cashier Panel:** භාණ්ඩ ඉක්මනින් ස්කෑන් කර බිල්පත් සෑදීමට හැකි සරල අතුරුමුහුණතක්.
*   **Admin Dashboard:** තොග වාර්තා (Inventory), අලෙවි වාර්තා (Sales reports) සහ සේවක පැමිණීම් බැලිය හැකි පාලක පුවරුවක්.

### පියවර 3: පද්ධති දෙක එකිනෙකට සම්බන්ධ කිරීම (Integration)
*   Frontend එකෙන් Backend API ඇමතීම සඳහා **Axios** හෝ **Fetch API** භාවිතා කරන්න.
*   පද්ධති දෙක සර්වර් දෙකක ධාවනය වන විට සිදුවන බාධා වැළැක්වීමට Backend එක තුළ **CORS (Cross-Origin Resource Sharing)** නිවැරදිව Configure කරන්න.