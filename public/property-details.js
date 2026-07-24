const style = document.createElement("style");
style.innerHTML = `
/* CSS التقييمات */
    /* مودال الرفض (اليد) */
    .refusal-modal-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: linear-gradient(135deg, rgba(50,0,0,0.95), rgba(0,0,0,0.98));
        z-index: 20000; display: flex; justify-content: center; align-items: center;
        backdrop-filter: blur(10px); animation: fadeInRed 0.5s ease;
    }
    .refusal-content {
        text-align: center; color: white; position: relative;
    }
    .hand-icon-anim {
        font-size: 8rem; color: #ff4444;
        filter: drop-shadow(0 0 20px rgba(255,0,0,0.6));
        animation: giantHandEntry 1.2s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
    }
    @keyframes giantHandEntry {
        0% { transform: scale(0) translateY(100px); opacity: 0; }
        50% { transform: scale(3) rotate(-10deg); opacity: 1; }
        70% { transform: scale(1) rotate(0deg); }
        100% { transform: scale(1) translateY(-20px); }
    }
    @keyframes fadeInRed { from {opacity: 0;} to {opacity: 1;} }
    
    .refusal-text {
        font-size: 1.5rem; font-weight: bold; margin-top: 20px;
        opacity: 0; animation: textFadeIn 0.5s ease 1s forwards;
    }
    @keyframes textFadeIn { to {opacity: 1;} }
    .rating-stars { color: #FFD700; font-size: 0.9rem; margin-right: 5px; }
    .btn-rate { 
        background: transparent; border: 1px solid #FFD700; color: #FFD700; 
        padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; 
        cursor: pointer; margin-right: 5px; transition:0.3s; 
    }
    .btn-rate:hover { background: #FFD700; color: #000; }
    
    /* مودال التقييم */
    .star-rating-input { direction: rtl; display: flex; justify-content: center; gap: 10px; font-size: 2rem; margin: 15px 0; }
    .star-rating-input i { cursor: pointer; color: #444; transition: 0.3s; }
    .star-rating-input i.active { color: #FFD700; }
    
    /* تصميم مودال الحالة */
    .status-modal-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.95); z-index: 10000; display: flex;
        justify-content: center; align-items: center; backdrop-filter: blur(5px);
    }
    .status-modal-content {
        background: #1c2630; padding: 30px; border-radius: 20px;
        width: 90%; max-width: 400px; text-align: center;
        border: 1px solid #333; position: relative;
        box-shadow: 0 0 30px rgba(0,0,0,0.5);
    }
    .status-icon-box { font-size: 3.5rem; margin-bottom: 20px; }
    .status-note-box {
        background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;
        margin: 20px 0; text-align: right; border-right: 4px solid;
    }
    .btn-status-action {
        width: 100%; padding: 15px; border-radius: 50px; border: none;
        font-weight: bold; font-size: 1.1rem; cursor: pointer; margin-top: 10px;
    }

    /* باقي الستايلات */
    .video-btn-modern {
        background: linear-gradient(135deg, #ff0000, #c0392b);
        color: white; border: none; padding: 12px 30px; border-radius: 50px;
        display: flex; align-items: center; gap: 15px; cursor: pointer;
        font-size: 1.1rem; font-weight: bold; box-shadow: 0 10px 20px rgba(192, 57, 43, 0.4);
        transition: all 0.3s ease; margin: 20px auto; width: fit-content; text-decoration: none;
    }
    .video-btn-modern:hover { transform: translateY(-5px); box-shadow: 0 15px 30px rgba(192, 57, 43, 0.6); }
    
    .guest-action-box {
        text-align: center; padding: 30px 20px; background: rgba(255, 255, 255, 0.03);
        border: 1px dashed #00ff88; border-radius: 15px; margin-top: 20px;
    }
    .guest-btns-wrapper { display: flex; gap: 15px; justify-content: center; margin-top: 15px; flex-wrap: wrap; }
    .btn-login-action { background: transparent; border: 2px solid #00ff88; color: #00ff88; padding: 10px 25px; border-radius: 50px; text-decoration: none; font-weight: bold; transition: 0.3s; }
    .btn-login-action:hover { background: #00ff88; color: #000; }
    .btn-register-action { background: #00ff88; border: 2px solid #00ff88; color: #000; padding: 10px 25px; border-radius: 50px; text-decoration: none; font-weight: bold; transition: 0.3s; }
    .btn-register-action:hover { background: transparent; color: #00ff88; }

    .edit-modal-overlay {
        display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); z-index: 9999; align-items: center; justify-content: center;
        backdrop-filter: blur(5px);
    }
    .edit-modal-content {
        background: #1c2630; padding: 25px; border-radius: 15px; border: 1px solid #00ff88;
        width: 95%; max-width: 600px; box-shadow: 0 0 30px rgba(0, 255, 136, 0.15);
        max-height: 90vh; overflow-y: auto;
    }
    .edit-input-group { margin-bottom: 15px; }
    .edit-input-group label { display: block; color: #aaa; margin-bottom: 5px; font-size: 0.9rem; font-weight: bold; }
    .edit-input { width: 100%; padding: 12px; background: #2a3b4c; border: 1px solid #444; color: #fff; border-radius: 8px; outline: none; font-size: 1rem; transition: 0.3s; }
    .edit-input:focus { border-color: #00ff88; box-shadow: 0 0 8px rgba(0,255,136,0.2); }
    .edit-actions { display: flex; gap: 10px; margin-top: 25px; }
    .btn-save { background: linear-gradient(45deg, #00ff88, #00cc6a); color: #000; border: none; padding: 12px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; flex: 2; transition: 0.3s; }
    .btn-save:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,255,136,0.3); }
    .btn-cancel { background: #ff4444; color: #fff; border: none; padding: 12px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; flex: 1; transition: 0.3s; }
    .btn-cancel:hover { background: #cc0000; }

    .img-grid-container { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
    .img-box { position: relative; width: 100px; height: 80px; border-radius: 8px; overflow: hidden; border: 2px solid #444; transition: 0.3s; }
    .img-box img { width: 100%; height: 100%; object-fit: cover; }
    .img-box:hover { border-color: #00ff88; }
    .delete-img-btn { position: absolute; top: 2px; right: 2px; background: rgba(255,68,68,0.9); color: white; border: none; width: 22px; height: 22px; border-radius: 50%; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; }
    .delete-img-btn:hover { background: #ff0000; transform: scale(1.1); }
`;
document.head.appendChild(style);

window.formatPrice = (price, type) => {
  if (!price) return "N/A";
  const formatted = parseFloat(price).toLocaleString("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
  });
  return `<span class="detail-price">${formatted}</span> ${
    type === "rent" || type === "إيجار" ? "/ شهرياً" : ""
  }`;
};

window.getTypeTag = (type) => {
  if (type === "buy" || type === "شراء" || type === "بيع")
    return `<span class="property-type sale">للبيع</span>`;
  else if (type === "rent" || type === "إيجار")
    return `<span class="property-type rent">للإيجار</span>`;
  return "";
};

window.openOfferModal = () => {
  document.getElementById("offer-modal").style.display = "flex";
};
window.closeOfferModal = () => {
  document.getElementById("offer-modal").style.display = "none";
};

window.toggleFavorite = async (propertyId) => {
  const btn = document.getElementById("favoriteBtn");
  const favIcon = btn.querySelector("i");
  const isFavorite = btn.classList.contains("is-favorite");
  const method = isFavorite ? "DELETE" : "POST";
  const url = isFavorite ? `/api/favorites/${propertyId}` : `/api/favorites`;
  const body = isFavorite ? null : JSON.stringify({ propertyId });

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (response.status === 401) {
      alert("يجب تسجيل الدخول لإضافة العقار للمفضلة.");
      window.location.href = "authentication";
      return;
    }
    if (response.ok || response.status === 409) {
      if (isFavorite) {
        btn.classList.remove("is-favorite");
        favIcon.className = "far fa-heart";
        alert("تمت الإزالة من المفضلة.");
      } else {
        btn.classList.add("is-favorite");
        favIcon.className = "fas fa-heart";
        alert("تمت الإضافة للمفضلة.");
      }
    }
  } catch (error) {
    console.error("Favorite Error:", error);
  }
};

window.shareProperty = async (title) => {
  const shareData = {
    title: `عقارك - ${title}`,
    text: `شاهد هذا العقار المميز على موقع عقارك: ${title}`,
    url: window.location.href,
  };
  try {
    if (navigator.share) await navigator.share(shareData);
    else {
      await navigator.clipboard.writeText(window.location.href);
      alert("تم نسخ الرابط!");
    }
  } catch (err) {
    console.error("Error sharing:", err);
  }
};

async function loadSimilarProperties(currentProperty) {
  const container = document.getElementById("similar-properties-container");
  const header = document.querySelector(".similar-properties-section h2");
  if (header)
    header.innerHTML = '<i class="fas fa-lightbulb"></i> عقارات مقترحة لك';

  try {
    const response = await fetch(
      `/api/properties/suggested/${currentProperty.id}`
    );
    const suggested = await response.json();

    if (!suggested || suggested.length === 0) {
      container.innerHTML =
        '<p style="text-align:center; color:#777;">لا توجد اقتراحات حالياً.</p>';
      return;
    }

    container.innerHTML = "";
    suggested.slice(0, 3).forEach((prop) => {
      const priceVal = prop.price
        ? Number(prop.price.replace(/[^0-9.]/g, "")).toLocaleString()
        : "N/A";
      const card = `
                <div class="property-card neon-glow" onclick="window.location.href='property?id=${
                  prop.id
                }'" style="position:relative; cursor:pointer;">
                    ${
                      prop.isFeatured
                        ? '<span style="position:absolute; top:10px; right:10px; background:#ffc107; color:black; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; z-index:2;">مميز</span>'
                        : ""
                    }
                    <div style="height:180px; overflow:hidden;">
                        <img src="${
                          prop.imageUrl || "logo.png"
                        }" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div class="card-content" style="padding:10px;">
                        <h4 style="font-size:1rem; margin-bottom:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:white;">${
                          prop.title
                        }</h4>
                        <p class="price" style="font-size:1rem; color:var(--neon-primary); font-weight:bold;">${priceVal} ج.م</p>
                    </div>
                </div>
            `;
      container.innerHTML += card;
    });
  } catch (e) {
    container.innerHTML = "";
  }
}

async function prefillUserData() {
  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();

    if (data.isAuthenticated) {
      const nameInput = document.getElementById("offer-name");
      const phoneInput = document.getElementById("offer-phone");

      if (nameInput && data.name) nameInput.value = data.name;
      if (phoneInput && data.phone) phoneInput.value = data.phone;
    }
  } catch (e) {
    console.error("Error prefilling user data", e);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  prefillUserData();
  const container = document.getElementById("property-detail-container");
  const loadingMessage = document.getElementById("loading-message");
  let currentImageIndex = 0;
  let imageUrls = [];

  const updateMainImage = (mainImage) => {
    if (imageUrls.length > 0) {
      mainImage.src = imageUrls[currentImageIndex];
      document.querySelectorAll(".thumbnail-image").forEach((thumb, index) => {
        thumb.classList.toggle("active", index === currentImageIndex);
      });
    }
  };

  try {
    let userRole = "guest";
    let currentUserPhone = null;
    let isAuthenticated = false;

    try {
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();
      if (authData.isAuthenticated) {
        userRole = authData.role;
        currentUserPhone = authData.phone;
        isAuthenticated = true;
        window.isPaymentActive = authData.isPaymentActive;
      }
    } catch (e) {
      console.log("Guest User");
    }

    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get("id");
    if (!propertyId) throw new Error("رابط غير صالح.");

    const response = await fetch(`/api/property/${propertyId}`);
    if (!response.ok) throw new Error("العقار غير موجود.");

    const property = await response.json();

    window.currentProperty = property;
    document.title = `${property.title} | عقارك`;

    imageUrls = [];
    if (property.imageUrls) {
      if (Array.isArray(property.imageUrls)) imageUrls = property.imageUrls;
      else if (typeof property.imageUrls === "string") {
        try {
          imageUrls = JSON.parse(property.imageUrls);
        } catch (e) {
          imageUrls = [property.imageUrl];
        }
      }
    }
    if (!imageUrls || imageUrls.length === 0)
      imageUrls = property.imageUrl ? [property.imageUrl] : ["logo.png"];
    imageUrls = imageUrls.filter((u) => u && u.trim() !== "");

    if (loadingMessage) loadingMessage.style.display = "none";

    const ownerPhone = property.sellerPhone;
    const formattedOwnerPhone = ownerPhone.replace(/\D/g, "").startsWith("0")
      ? "2" + ownerPhone
      : ownerPhone;
    const currentUrl = window.location.href;
    const whatsappLink = `https://wa.me/${formattedOwnerPhone}?text=${encodeURIComponent(
      `السلام عليكم، أنا مهتم بهذا العقار على موقع عقارك:\n${currentUrl}`
    )}`;

    const verifiedBadge = property.is_verified
      ? `<span class="fb-gold-badge" title="موثق"><i class="fas fa-check"></i></span>`
      : "";

    let publisherHTML = "";
    let publisherStatsBadge = "";
    let profileImgSrc = property.profile_picture || "logo.png";

    let ratingStats = { average: 0, count: 0 };
    try {
      const rRes = await fetch(`/api/reviews/stats/${property.sellerPhone}`);
      const contentType = rRes.headers.get("content-type");
      if (rRes.ok && contentType && contentType.includes("application/json")) {
        ratingStats = await rRes.json();
      } else {
        console.warn("Rating API returned non-JSON response");
      }
    } catch (e) {
      console.error("Error loading ratings, defaulting to 0.");
    }

    const starsHTML = `
    <a href="profile?u=${
      property.publisherUsername
    }&tab=reviews" style="text-decoration:none;">
        <div style="display:flex; align-items:center; gap: 6px; background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 20px; border: 1px solid #444; cursor: pointer; transition: 0.3s;" onmouseover="this.style.borderColor='#FFD700'" onmouseout="this.style.borderColor='#444'">
            <i class="fas fa-star" style="color: #FFD700; font-size: 0.9rem;"></i>
            <span style="color: #fff; font-weight: bold; font-size: 1rem;">${Number(
              ratingStats.average || 0
            ).toFixed(1)}</span>
            <span style="color: #888; font-size: 0.8rem;">(${
              ratingStats.count || 0
            })</span>
        </div>
    </a>
`;

    const rateButtonHTML =
      isAuthenticated && currentUserPhone !== property.sellerPhone
        ? `
        <button onclick="openRateModal('${property.sellerPhone}', '${property.sellerName}')" 
            style="background: transparent; border: 1px solid var(--neon-primary); color: var(--neon-primary); 
            padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 5px;">
            <i class="far fa-edit"></i> تقييم
        </button>
    `
        : "";

    let reportBtnHTML = "";
    if (isAuthenticated && currentUserPhone !== property.sellerPhone) {
      reportBtnHTML = `
            <button onclick="document.getElementById('report-modal').style.display='flex'" 
                style="background: transparent; border: none; color: #ff4444; font-size: 0.9rem; cursor: pointer; opacity: 0.7; transition: 0.3s;" title="إبلاغ">
                <i class="fas fa-flag"></i>
            </button>
        `;
    }

    const profileLink = property.publisherUsername
      ? `profile?u=${property.publisherUsername}`
      : "#";

    if (property.publisherUsername) {
      try {
        const statsRes = await fetch(
          `/api/public/profile/${property.publisherUsername}`
        );
        if (
          statsRes.ok &&
          statsRes.headers.get("content-type")?.includes("application/json")
        ) {
          const statsData = await statsRes.json();
          const count = statsData.properties ? statsData.properties.length : 0;
          publisherStatsBadge = `
                    <span style="font-size: 0.75rem; color: #aaa; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; margin-top:4px; display:inline-block;">
                        <i class="fas fa-building"></i> ${count} عقار
                    </span>
                `;
        }
      } catch (e) {}
    }

    publisherHTML = `
        <div class="publisher-card" style="
            margin-top: 20px; 
            padding: 16px; 
            border-radius: 16px; 
            background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%); 
            border: 1px solid rgba(255,255,255,0.1);
            position: relative;
            overflow: hidden;
        ">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <a href="${profileLink}" style="text-decoration: none; position: relative;">
                    <img src="${profileImgSrc}" onerror="this.src='logo.png'" style="width: 55px; height: 55px; border-radius: 50%; object-fit: cover; border: 2px solid var(--neon-primary); box-shadow: 0 0 10px rgba(0,255,136,0.2);" alt="Publisher">
                    ${
                      property.publisherUsername
                        ? '<div style="position: absolute; bottom: 0; right: 0; width: 12px; height: 12px; background: #00ff88; border-radius: 50%; border: 2px solid #1a1a1a;"></div>'
                        : ""
                    }
                </a>
                
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <p style="color: #888; font-size: 0.75rem; margin: 0;">الناشر</p>
                        ${reportBtnHTML}
                    </div>
                    
                    <a href="${profileLink}" style="display: block; color: #fff; text-decoration: none; font-weight: bold; font-size: 1.1rem; margin: 2px 0;">
                        ${
                          property.sellerName || "مستخدم عقارك"
                        } ${verifiedBadge}
                    </a>
                    
                    ${publisherStatsBadge}
                </div>
            </div>

            <div style="height: 1px; background: rgba(255,255,255,0.1); margin-bottom: 12px;"></div>

            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                ${starsHTML}
                ${rateButtonHTML}
            </div>
        </div>
    `;
    let actionSectionHTML = "";
    let makeOfferButtonHTML = "";

    if (isAuthenticated) {
      const negOwnerPhone = property.sellerPhone
        ? property.sellerPhone.replace(/\D/g, "").startsWith("0")
          ? "2" + property.sellerPhone
          : property.sellerPhone
        : "201008102237";
      const negLink = `https://wa.me/${negOwnerPhone}?text=${encodeURIComponent(
        `سلام عليكم، كنت محتاج أتفاوض بخصوص السعر للعقار: ${property.title}`
      )}`;

      makeOfferButtonHTML = `
                <button onclick="window.handleWhatsappClick('${negLink}')" class="btn-offer" style="background: linear-gradient(45deg, #ff9800, #ff5722); color: white; border: none; padding: 5px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    <i class="fas fa-handshake"></i> تفاوض
                </button>
            `;

      let ownerControlsHTML = "";
      const isOwner =
        currentUserPhone &&
        property.sellerPhone &&
        currentUserPhone === property.sellerPhone;
      const isAdmin = userRole === "admin";

      if (isOwner || isAdmin) {
        const controlTitle = isAdmin
          ? "تحكم الإدارة 🛡️"
          : "أنت صاحب هذا العقار 👑";

        let featureBtnHTML = "";
        if (window.isPaymentActive && !property.isFeatured) {
          featureBtnHTML = `
                        <button onclick="openFeatureModal(${property.id})" class="btn-neon-auth" style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); border:none; color: black; flex: 1.5; margin-bottom:10px; width:100%; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3); position: relative; overflow: hidden;">
                            <i class="fas fa-crown" style="margin-left:5px;"></i> ترقية لمميز
                            <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); transform:skewX(-20deg) translateX(-150%); animation: shine 3s infinite;"></div>
                        </button>
                        <style>@keyframes shine { 0% { transform: skewX(-20deg) translateX(-150%); } 20% { transform: skewX(-20deg) translateX(150%); } 100% { transform: skewX(-20deg) translateX(150%); } }</style>
                    `;
        } else if (property.isFeatured) {
          featureBtnHTML = `
                        <div style="background: rgba(255, 215, 0, 0.1); border: 1px solid #FFD700; color: #FFD700; padding: 10px; border-radius: 50px; margin-bottom: 10px; font-size: 0.9rem; font-weight: bold;">
                            <i class="fas fa-check-circle"></i> هذا العقار مميز (Premium)
                        </div>
                    `;
        }

        ownerControlsHTML = `
                    <div style="margin-top: 20px; padding: 20px; border: 1px solid ${
                      isAdmin ? "#e91e63" : "#00ff88"
                    }; border-radius: 16px; background: rgba(255, 255, 255, 0.03); text-align: center; backdrop-filter: blur(5px);">
                        <p style="color: ${
                          isAdmin ? "#e91e63" : "#00ff88"
                        }; font-weight: bold; margin-bottom: 15px; font-size: 1.1rem;">
                            ${controlTitle}
                        </p>
                        ${featureBtnHTML}
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button onclick="openEditPropertyModal()" class="btn-neon-auth" style="background: rgba(33, 150, 243, 0.1); border-color: #2196F3; color: #2196F3; flex: 1;">
                                <i class="fas fa-edit"></i> تعديل
                            </button>
                            <button onclick="deleteProperty(${
                              property.id
                            })" class="btn-neon-auth" style="background: rgba(255, 68, 68, 0.1); border-color: #ff4444; color: #ff4444; flex: 1;">
                                <i class="fas fa-trash"></i> حذف
                            </button>
                        </div>
                    </div>
                `;

        injectEditModal(property);
        if (window.isPaymentActive) injectFeatureModal();
      }
      let isFav = false;
      try {
        const favRes = await fetch(`/api/favorites`);
        if (favRes.ok) {
          const favs = await favRes.json();
          isFav = favs.some((f) => f.id === property.id);
        }
      } catch (e) {}
      const favClass = isFav ? "is-favorite" : "";
      const favIcon = isFav ? "fas fa-heart" : "far fa-heart";

      actionSectionHTML = `
            <div class="action-buttons-grid">
                <button onclick="window.handleWhatsappClick('${whatsappLink}', '${property.sellerPhone}')" class="action-btn btn-whatsapp-modern">
                    <i class="fab fa-whatsapp"></i>
                    <span>واتساب</span>
                </button>

                <a href="tel:${property.sellerPhone}" class="action-btn btn-call-modern">
                    <i class="fas fa-phone-alt"></i>
                    <span>اتصال</span>
                </a>

                <button onclick="window.shareProperty('${property.title}')" class="action-btn btn-icon-only" title="مشاركة">
                    <i class="fas fa-share-alt"></i>
                </button>

                <button id="favoriteBtn" data-id="${property.id}" onclick="window.toggleFavorite(${property.id})" class="action-btn btn-icon-only ${favClass}" title="مفضلة">
                    <i id="favIcon" class="${favIcon}"></i>
                </button>
            </div>
            ${ownerControlsHTML}
        `;
    } else {
      actionSectionHTML = `
            <div class="guest-action-box">
                <p style="color:#ccc; margin-bottom:15px; font-size:0.95rem;">
                    <i class="fas fa-lock" style="color:#00ff88; margin-left:5px;"></i> يجب تسجيل الدخول للتواصل مع المالك.
                </p>
                <div class="guest-btns-wrapper">
                    <a href="authentication" class="btn-login-action">تسجيل دخول</a>
                    <a href="authentication?mode=register" class="btn-register-action">إنشاء حساب</a>
                </div>
            </div>
        `;
    }

    let videoSectionHTML = "";
    const videoList = Array.isArray(property.video_urls)
      ? property.video_urls
      : [];
    if (videoList.length > 0) {
      videoSectionHTML = `<div style="width: 100%; display: flex; justify-content: center; margin-bottom: 20px;"><button onclick="goToCinemaMode()" class="video-btn-modern"><div class="icon-pulse">▶</div><span>مشاهدة فيديو العقار</span><span class="badge" style="background:white; color:red; padding:2px 6px; border-radius:50%; font-size:0.8rem; margin-right:5px;">${videoList.length}</span></button></div>`;
      window.goToCinemaMode = () => {
        localStorage.setItem("activePropertyVideos", JSON.stringify(videoList));
        window.location.href = "watch";
      };
    }

    let specsHTML = `<li><span>المساحة:</span> ${property.area} م² <i class="fas fa-ruler-combined"></i></li>`;
    if (property.governorate) {
      specsHTML += `<li><span>المحافظة:</span> ${property.governorate} <i class="fas fa-map-marker-alt"></i></li>`;
    }
    if (property.city) {
      specsHTML += `<li><span>المدينة:</span> ${property.city} <i class="fas fa-city"></i></li>`;
    }
    if (property.rooms && parseInt(property.rooms) > 0)
      specsHTML += `<li><span>الغرف:</span> ${property.rooms} <i class="fas fa-bed"></i></li>`;
    if (property.bathrooms && parseInt(property.bathrooms) > 0)
      specsHTML += `<li><span>الحمامات:</span> ${property.bathrooms} <i class="fas fa-bath"></i></li>`;
    if (property.level && property.level !== "undefined")
      specsHTML += `<li><span>الدور:</span> ${property.level} <i class="fas fa-layer-group"></i></li>`;
    if (property.floors_count && parseInt(property.floors_count) > 0)
      specsHTML += `<li><span>عدد الأدوار:</span> ${property.floors_count} <i class="fas fa-building"></i></li>`;
    if (property.finishing_type && property.finishing_type !== "undefined")
      specsHTML += `<li><span>التشطيب:</span> ${property.finishing_type} <i class="fas fa-paint-roller"></i></li>`;

    container.innerHTML = `
            <div class="property-detail-content">
                <h1 class="page-title">${property.title} ${window.getTypeTag(
      property.type
    )}</h1>
                ${
                  property.isLegal
                    ? `<div class="legal-trust-box neon-glow"><div class="legal-icon"><i class="fas fa-shield-alt"></i></div><div class="legal-content"><h4>عقار تم الفحص القانوني له ✅</h4><p>تمت مراجعة أوراق هذا العقار.</p></div></div>`
                    : ""
                }
                
                <div class="details-layout">
                    <div class="details-info-frame neon-glow">
                        <div class="price-type-info" style="display:flex; justify-content:space-between; align-items:center;">
                            <p class="detail-price" style="margin:0;">${window.formatPrice(
                              property.price,
                              property.type
                            )}</p>
                            ${makeOfferButtonHTML}
                        </div>

                         <div style="margin: 10px 0;">
                            ${
                              property.isFeatured
                                ? '<span class="badge-featured-main"><i class="fas fa-star"></i> عقار مميز</span>'
                                : ""
                            }
                        </div>
                        
                        <div id="admin-secret-box" style="display:none; margin:15px 0; background:#fff0f0; border:2px dashed #dc3545; padding:10px; border-radius:8px;">
                            <h4 style="color:#dc3545; margin:0 0 10px 0;"><i class="fas fa-lock"></i> الأدمن</h4>
                            <div style="color:#333; font-size:0.95rem;">
                                <p><strong>المالك:</strong> <span>${
                                  property.sellerName || "-"
                                }</span></p>
                                <p><strong>الهاتف:</strong> <span>${
                                  property.sellerPhone || "-"
                                }</span></p>
                                <p><strong>الكود:</strong> <span>${
                                  property.hiddenCode
                                }</span></p>
                            </div>
                        </div>

                        <div class="property-specs">
                            <ul class="specs-list">
                                ${specsHTML}
                            </ul>
                        </div>

                        ${videoSectionHTML}

                        ${
                          property.nearby_services
                            ? `
<div class="ai-insight-box neon-glow" style="background: linear-gradient(145deg, #0a0a0a, #1a1a1a); border: 1px solid #333; border-right: 4px solid #00ff88; padding: 20px; border-radius: 12px; position: relative; overflow: hidden;">
    <div style="position: absolute; top: -20px; left: -20px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(0,255,136,0.1) 0%, transparent 70%); border-radius: 50%;"></div>
    <div class="ai-header" style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
        <div style="width: 40px; height: 40px; background: rgba(0,255,136,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid #00ff88;">
            <i class="fas fa-brain" style="color: #00ff88; font-size: 1.2rem;"></i>
        </div>
        <div>
            <h4 style="margin: 0; color: white; font-size: 1.1rem;">تحليل عقارك الذكي</h4>
            <span style="font-size: 0.75rem; color: #888;">AI Location Analysis</span>
        </div>
    </div>
    <div class="ai-content">
        <p style="color: #ccc; font-size: 0.95rem; line-height: 1.7;">
            يتميز هذا العقار بموقع استراتيجي، حيث يحيط به الخدمات التالية:
        </p>
        <div class="services-tags" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
            ${property.nearby_services
              .split(",")
              .map(
                (service) => `
                <span class="service-tag" style="background: rgba(255,255,255,0.05); border: 1px solid #444; padding: 6px 14px; border-radius: 50px; font-size: 0.85rem; color: white; display: flex; align-items: center; gap: 6px;">
                    <i class="fas fa-check-circle" style="color: #00ff88; font-size: 0.8rem;"></i> ${service.trim()}
                </span>
            `
              )
              .join("")}
        </div>
    </div>
</div>
`
                            : ""
                        }
                        
                        <div class="property-description-box" style="margin-top:20px;">
                            <h3 style="color:#00ff88; margin-bottom:10px;">الوصف</h3>
                            <p style="color:#ccc; line-height:1.6;">${
                              property.description || "لا يوجد وصف."
                            }</p>
                        </div>
                        
                        ${publisherHTML}
                        ${actionSectionHTML}
                    </div>
                    
                    <div class="image-gallery-frame neon-glow">
                        <div class="gallery-inner">
                            <div class="main-image-container">
                                <img id="property-main-image" src="${
                                  imageUrls[0]
                                }" class="main-image">
                                ${
                                  imageUrls.length > 1
                                    ? `<button id="prev-image" class="gallery-nav-btn prev-btn"><i class="fas fa-chevron-right"></i></button><button id="next-image" class="gallery-nav-btn next-btn"><i class="fas fa-chevron-left"></i></button>`
                                    : ""
                                }
                            </div>
                            <div id="image-thumbnails" class="image-thumbnails"></div>
                        </div>
                    </div>
                </div>
                
                <div class="similar-properties-section" style="margin-top: 50px;">
                    <h2 style="margin-bottom: 20px; border-bottom: 2px solid var(--neon-secondary); display:inline-block; padding-bottom:5px; color:white;">
                        <i class="fas fa-home"></i> عقارات مشابهة
                    </h2>
                    <div id="similar-properties-container" class="listings-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:15px;">
                        <p>جاري البحث...</p>
                    </div>
                </div>

                <div id="map3d-section" style="margin-top: 50px; display: none;">
                    <h2 style="margin-bottom: 20px; border-bottom: 2px solid var(--neon-primary); display:inline-block; padding-bottom:5px; color:white;">
                        <i class="fas fa-mountain"></i> خريطة الموقع ثلاثية الأبعاد
                    </h2>
                    <div id="map3d-container" style="width: 100%; height: 400px; border-radius: 16px; overflow: hidden; border: 1px solid #333;"></div>
                    <div style="margin-top: 10px; display: flex; gap: 10px;">
                        <button onclick="resetMap3D()" style="flex:1; padding: 10px; background: rgba(0,255,136,0.1); border: 1px solid var(--neon-primary); color: var(--neon-primary); border-radius: 10px; cursor: pointer; font-family: inherit;">
                            <i class="fas fa-sync-alt"></i> إعادة ضبط
                        </button>
                        <button onclick="toggleMap3DMode()" style="flex:1; padding: 10px; background: rgba(0,212,255,0.1); border: 1px solid var(--neon-secondary); color: var(--neon-secondary); border-radius: 10px; cursor: pointer; font-family: inherit;">
                            <i class="fas fa-cube"></i> تبديل الوضع
                        </button>
                        <button id="style-toggle-btn" onclick="toggleMap3DStyle()" style="flex:1; padding: 10px; background: rgba(255,215,0,0.1); border: 1px solid #FFD700; color: #FFD700; border-radius: 10px; cursor: pointer; font-family: inherit;">
                            <i class="fas fa-palette"></i> فاضي
                        </button>
                    </div>
                </div>
            </div>
        `;

    if (userRole === "admin") {
      const box = document.getElementById("admin-secret-box");
      if (box) {
        box.style.display = "block";
        const controlsDiv = document.createElement("div");
        controlsDiv.style.marginTop = "10px";
        controlsDiv.style.display = "flex";
        controlsDiv.style.gap = "10px";

        const createBadgeBtn = (text, isActive, color, onClick) => {
          const btn = document.createElement("button");
          btn.className = "btn-neon-auth";
          btn.style.fontSize = "0.7rem";
          btn.style.padding = "5px 10px";
          btn.style.background = isActive ? color : "#555";
          btn.style.color = isActive ? "#000" : "#fff";
          btn.innerHTML = isActive
            ? `<i class="fas fa-check"></i> ${text}`
            : `تفعيل ${text}`;
          btn.onclick = onClick;
          return btn;
        };

        controlsDiv.appendChild(
          createBadgeBtn("مميز", property.isFeatured, "#ffc107", async () => {
            if (!confirm("تغيير حالة التميز؟")) return;
            await fetch(`/api/admin/toggle-badge/${property.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "isFeatured",
                value: !property.isFeatured,
              }),
            });
            location.reload();
          })
        );

        controlsDiv.appendChild(
          createBadgeBtn("قانوني", property.isLegal, "#28a745", async () => {
            if (!confirm("تغيير حالة الفحص القانوني؟")) return;
            await fetch(`/api/admin/toggle-badge/${property.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "isLegal",
                value: !property.isLegal,
              }),
            });
            location.reload();
          })
        );

        box.appendChild(controlsDiv);
      }
    }

    const mainImg = document.getElementById("property-main-image");
    const thumbsContainer = document.getElementById("image-thumbnails");
    const update = () => updateMainImage(mainImg);

    if (imageUrls.length > 1) {
      document.getElementById("prev-image").onclick = () => {
        currentImageIndex =
          (currentImageIndex - 1 + imageUrls.length) % imageUrls.length;
        update();
      };
      document.getElementById("next-image").onclick = () => {
        currentImageIndex = (currentImageIndex + 1) % imageUrls.length;
        update();
      };
    } else {
      document
        .querySelectorAll(".gallery-nav-btn")
        .forEach((b) => (b.style.display = "none"));
    }

    imageUrls.forEach((url, i) => {
      const img = document.createElement("img");
      img.src = url;
      img.className = `thumbnail-image ${i === 0 ? "active" : ""}`;
      img.onclick = () => {
        currentImageIndex = i;
        update();
      };
      thumbsContainer.appendChild(img);
    });

    const favBtn = document.getElementById("favoriteBtn");
    if (favBtn) favBtn.onclick = () => window.toggleFavorite(property.id);

    loadSimilarProperties(property);
    if (window.setupLightbox) window.setupLightbox(imageUrls);

    if (property.latitude && property.longitude) {
      await initMap3D(parseFloat(property.latitude), parseFloat(property.longitude));
    }

    const offerForm = document.getElementById("offer-form");
    if (offerForm) {
      offerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = offerForm.querySelector("button");
        const originalText = btn.innerHTML;
        btn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
        btn.disabled = true;
        const data = {
          propertyId: property.id,
          buyerName: document.getElementById("offer-name").value,
          buyerPhone: document.getElementById("offer-phone").value,
          offerPrice: document.getElementById("offer-price").value,
        };
        try {
          const res = await fetch("/api/make-offer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const resData = await res.json();
          if (res.ok) {
            alert("✅ " + resData.message);
            window.closeOfferModal();
            offerForm.reset();
          } else {
            throw new Error(resData.message);
          }
        } catch (error) {
          alert("❌ خطأ: " + error.message);
        } finally {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }
      });
    }
  } catch (error) {
    console.error(error);
    container.innerHTML = `<p class="error">خطأ: ${error.message}</p>`;
    if (loadingMessage) loadingMessage.style.display = "none";
  }
});

let currentEditImages = [];
let newEditFiles = [];

function injectEditModal(prop) {
  currentEditImages = [];
  newEditFiles = [];
  try {
    if (Array.isArray(prop.imageUrls)) currentEditImages = prop.imageUrls;
    else if (prop.imageUrls) currentEditImages = JSON.parse(prop.imageUrls);
    else if (prop.imageUrl) currentEditImages = [prop.imageUrl];
  } catch (e) {
    currentEditImages = [];
  }

  const oldModal = document.getElementById("edit-modal");
  if (oldModal) oldModal.remove();

  const isSale =
    prop.type === "buy" || prop.type === "بيع" || prop.type === "sale";
  const isRent =
    prop.type === "rent" || prop.type === "إيجار" || prop.type === "rent";

  const modalHTML = `
        <div id="edit-modal" class="edit-modal-overlay" style="backdrop-filter: blur(8px); background: rgba(0,0,0,0.8);">
            <div class="edit-modal-content" style="background: #0a0a0a; border: 1px solid #222; box-shadow: 0 20px 50px rgba(0,0,0,0.9); max-width: 600px; width: 95%;">
                
                <h3 style="color:#fff; margin-bottom:25px; text-align:center; font-family: sans-serif; letter-spacing: 1px;">
                    <span style="border-bottom: 2px solid #00ff88; padding-bottom: 5px;">تعديل بيانات العقار</span>
                </h3>
                
                <div style="background: #111; padding: 20px; border-radius: 16px; margin-bottom: 25px; border: 1px solid #222;">
                    <label style="color: #888; font-size: 0.9rem; display: block; margin-bottom: 15px; display:flex; justify-content:space-between;">
                        <span>📸 صور العقار</span>
                        <span style="font-size:0.8rem; color:#444;">يجب الإبقاء على صورة واحدة</span>
                    </label>
                    <div id="edit-images-container" class="img-grid-container" style="gap:10px;"></div>
                    
                    <input type="file" id="new-images-input" multiple accept="image/*" style="display: none;">
                    <button type="button" onclick="document.getElementById('new-images-input').click()" 
                        class="btn-login-action" style="width: 100%; border: 1px dashed #333; color: #fff; margin-top: 15px; background: #1a1a1a; transition:0.3s;">
                        <i class="fas fa-camera"></i> إضافة صور جديدة
                    </button>
                </div>

                <form id="edit-property-form">
                    <div class="edit-input-group">
                        <label style="color:#888; font-size:0.9rem; margin-bottom:8px;">نوع العرض</label>
                        <div class="neon-toggle-wrapper" style="display:flex; gap:10px; background:#000; padding:6px; border-radius:12px; border:1px solid #222;">
                            <label class="neon-radio-label">
                                <input type="radio" name="type" value="buy" ${
                                  isSale ? "checked" : ""
                                }>
                                <span class="neon-radio-btn sale-btn"><i class="fas fa-handshake"></i> بيع</span>
                            </label>
                            <label class="neon-radio-label">
                                <input type="radio" name="type" value="rent" ${
                                  isRent ? "checked" : ""
                                }>
                                <span class="neon-radio-btn rent-btn"><i class="fas fa-clock"></i> إيجار</span>
                            </label>
                        </div>
                        <style>
                            .neon-radio-label { flex: 1; cursor: pointer; }
                            .neon-radio-label input { display: none; }
                            .neon-radio-btn { 
                                display: flex; align-items: center; justify-content: center; gap: 8px;
                                width: 100%; padding: 12px; border-radius: 8px; 
                                color: #555; font-weight: 500; transition: all 0.3s ease;
                                background: transparent; border: 1px solid transparent;
                            }
                            /* Active States */
                            .neon-radio-label input:checked + .sale-btn {
                                background: #111; color: #00ff88; border-color: #00ff88;
                                box-shadow: 0 0 15px rgba(0, 255, 136, 0.1);
                            }
                            .neon-radio-label input:checked + .rent-btn {
                                background: #111; color: #00d4ff; border-color: #00d4ff;
                                box-shadow: 0 0 15px rgba(0, 212, 255, 0.1);
                            }
                            /* Input Styles */
                            .dark-input {
                                background: #111 !important; border: 1px solid #222 !important; 
                                color: #fff !important; padding: 12px !important; border-radius: 8px !important;
                                width: 100%; box-sizing: border-box;
                            }
                            .dark-input:focus { border-color: #444 !important; outline: none; }
                        </style>
                    </div>

                    <div class="edit-input-group">
                        <label style="color:#888;">العنوان</label>
                        <input type="text" name="title" class="dark-input" value="${
                          prop.title
                        }" required>
                    </div>
                    <div class="edit-input-group">
                        <label style="color:#888;">السعر</label>
                        <input type="text" name="price" class="dark-input" value="${
                          prop.price
                        }" required>
                    </div>
                    
                    <div class="edit-input-group" style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label style="color:#888;">المساحة</label>
                            <input type="number" name="area" class="dark-input" value="${
                              prop.area
                            }" required>
                        </div>
                        <div style="flex:1;">
                            <label style="color:#888;">الغرف</label>
                            <input type="number" name="rooms" class="dark-input" value="${
                              prop.rooms
                            }">
                        </div>
                        <div style="flex:1;">
                            <label style="color:#888;">الحمامات</label>
                            <input type="number" name="bathrooms" class="dark-input" value="${
                              prop.bathrooms
                            }">
                        </div>
                    </div>

                    <div class="edit-input-group">
                        <label style="color:#888;">الوصف</label>
                        <textarea name="description" class="dark-input" rows="4">${
                          prop.description
                        }</textarea>
                    </div>

                    <div class="edit-actions" style="margin-top: 30px; gap: 10px; display:flex;">
                        <button type="submit" class="btn-save" style="flex:2; background: #fff; color: #000; border: none; font-weight:bold; padding:12px; border-radius:8px;">حفظ التغييرات</button>
                        <button type="button" onclick="closeEditModal()" class="btn-cancel" style="flex:1; background: transparent; border: 1px solid #333; color: #888; border-radius:8px;">إلغاء</button>
                    </div>
                </form>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  renderEditImages();

  document
    .getElementById("new-images-input")
    .addEventListener("change", (e) => {
      newEditFiles = [...newEditFiles, ...Array.from(e.target.files)];
      renderEditImages();
      e.target.value = "";
    });

  document
    .getElementById("edit-property-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const selectedType = document.querySelector(
        'input[name="type"]:checked'
      ).value;

      if (window.isPaymentActive) {
        if (!confirm("⚠️ سيتم خصم 1 نقطة. موافق؟")) {
          return;
        }
      }
      const btn = e.target.querySelector(".btn-save");
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      btn.disabled = true;

      const formData = new FormData();
      formData.append("title", e.target.title.value);
      formData.append("price", e.target.price.value);
      formData.append("area", e.target.area.value);
      formData.append("rooms", e.target.rooms.value);
      formData.append("bathrooms", e.target.bathrooms.value);
      formData.append("description", e.target.description.value);
      formData.append("type", selectedType);

      formData.append("keptImages", JSON.stringify(currentEditImages));
      newEditFiles.forEach((file) => formData.append("newImages", file));

      try {
        const res = await fetch(`/api/user/property/${prop.id}`, {
          method: "PUT",
          body: formData,
        });
        const data = await res.json();
        closeEditModal();
        if (res.ok) {
          window.showStatusModal(
            "success",
            "تم التعديل",
            "تم تحديث البيانات بنجاح"
          );
        } else {
          if (data.status === "rejected") {
            window.showStatusModal(
              "rejected",
              "مرفوض",
              "المحتوى مخالف",
              data.reason
            );
          } else {
            alert(data.message);
          }
        }
      } catch (err) {
        console.error(err);
        alert("خطأ");
      } finally {
        if (document.querySelector(".btn-save")) {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }
      }
    });
}

function renderEditImages() {
  const container = document.getElementById("edit-images-container");
  container.innerHTML = "";

  // تنسيق الشبكة (Grid)
  container.style.display = "grid";
  container.style.gridTemplateColumns = "repeat(auto-fill, minmax(80px, 1fr))";
  container.style.gap = "10px";

  // عرض الصور القديمة (المحفوظة)
  currentEditImages.forEach((url, index) => {
    const div = document.createElement("div");
    div.className = "img-box";
    div.style.cssText = "position: relative; height: 80px; border-radius: 8px; overflow: hidden; border: 1px solid #333;";

    div.innerHTML = `
        <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">
        <button type="button" onclick="deleteEditImage(${index}, false)" 
            class="delete-img-btn"
            title="حذف الصورة"
            style="position: absolute; top: 4px; left: 4px; background: rgba(0,0,0,0.8); color: #ff4444; border: 1px solid #ff4444; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; z-index: 10;">
            <i class="fas fa-times" style="font-size: 10px;"></i>
        </button>
    `;
    container.appendChild(div);
  });

  // عرض الصور الجديدة (المرفوعة حالياً)
  newEditFiles.forEach((file, index) => {
    const div = document.createElement("div");
    div.className = "img-box";
    div.style.cssText = "position: relative; height: 80px; border-radius: 8px; overflow: hidden; border: 1px dashed #00ff88;";

    const img = document.createElement("img");
    img.style.cssText = "width: 100%; height: 100%; object-fit: cover; opacity: 0.8;";
    div.appendChild(img);

    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.readAsDataURL(file);

    const btnDiv = document.createElement("div");
    btnDiv.innerHTML = `
        <button type="button" onclick="deleteEditImage(${index}, true)" 
            class="delete-img-btn"
            title="إلغاء الرفع"
            style="position: absolute; top: 4px; left: 4px; background: rgba(0,0,0,0.8); color: #00ff88; border: 1px solid #00ff88; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; z-index: 10;">
            <i class="fas fa-times" style="font-size: 10px;"></i>
        </button>
    `;
    div.appendChild(btnDiv.firstElementChild);
    container.appendChild(div);
  });
}
window.deleteEditImage = function (index, isNew) {
  const totalImages = currentEditImages.length + newEditFiles.length;

  if (totalImages <= 1) {
    showWarningAnim(
      "عفواً، لا يمكن الحذف",
      "يجب أن يحتوي العقار على <b>صورة واحدة</b> على الأقل لضمان جودة الإعلان."
    );
    return;
  }

  if (isNew) {
    newEditFiles.splice(index, 1);
  } else {
    currentEditImages.splice(index, 1);
  }

  renderEditImages();
};

window.closeEditModal = () => {
  const modal = document.getElementById("edit-modal");
  if (modal) modal.remove();
};

window.openEditPropertyModal = () => {
  document.getElementById("edit-modal").style.display = "flex";
};
window.closeEditModal = () => {
  document.getElementById("edit-modal").style.display = "none";
};

window.deleteProperty = async (id) => {
  if (
    !confirm(
      "هل أنت متأكد تماماً من حذف هذا العقار؟ لا يمكن التراجع عن هذا الإجراء."
    )
  )
    return;
  try {
    const res = await fetch(`/api/user/property/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      alert("🗑️ تم حذف العقار بنجاح.");
      window.location.href = "home";
    } else {
      alert("❌ فشل الحذف: " + data.message);
    }
  } catch (err) {
    alert("خطأ في الاتصال بالسيرفر");
  }
};

window.setupLightbox = (images) => {
  const lightbox = document.getElementById("lightbox-modal");
  const lightboxImg = document.getElementById("lightbox-img");
  const counter = document.querySelector(".lightbox-counter");
  const closeBtn = document.querySelector(".close-lightbox");
  const nextBtn = document.querySelector(".next-lightbox");
  const prevBtn = document.querySelector(".prev-lightbox");
  const mainImage = document.getElementById("property-main-image");
  if (!lightbox) return;
  let currentIndex = 0;
  const open = (index) => {
    currentIndex = index;
    update();
    lightbox.style.display = "flex";
  };
  const update = () => {
    lightboxImg.src = images[currentIndex];
    counter.textContent = `${currentIndex + 1} / ${images.length}`;
  };
  const close = () => {
    lightbox.style.display = "none";
  };
  if (mainImage) {
    mainImage.style.cursor = "zoom-in";
    mainImage.addEventListener("click", () =>
      open(images.findIndex((img) => img === mainImage.src) || 0)
    );
  }
  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    update();
  });
  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex + 1) % images.length;
    update();
  });
  closeBtn.addEventListener("click", close);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });
  document.addEventListener("keydown", (e) => {
    if (lightbox.style.display === "flex") {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") nextBtn.click();
      if (e.key === "ArrowRight") prevBtn.click();
    }
  });
};

window.showStatusModal = (type, title, subtitle, note = "") => {
  const isSuccess = type === "success";
  const isRejected = type === "rejected";
  const icon = isSuccess
    ? "fas fa-check-circle"
    : isRejected
    ? "fas fa-times-circle"
    : "fas fa-clipboard-check";
  const color = isSuccess ? "#00ff88" : isRejected ? "#ff4444" : "#ff9800";

  const oldModal = document.getElementById("status-modal");
  if (oldModal) oldModal.remove();

  const modalHTML = `
        <div id="status-modal" class="status-modal-overlay">
            <div class="status-modal-content" style="border-color: ${color};">
                <div class="status-icon-box" style="color: ${color};"><i class="${icon}"></i></div>
                <h2 style="color: white; margin-bottom: 10px;">${title}</h2>
                <p style="color: #ccc; font-size: 0.95rem; margin-bottom: 20px;">${subtitle}</p>
                ${
                  note
                    ? `<div class="status-note-box" style="border-color: ${color};"><strong style="color: #fff; display:block; margin-bottom:5px;">💡 ملحوظة:</strong><span style="color: #ddd; font-size: 0.9rem;">${note}</span></div>`
                    : ""
                }
                <button onclick="document.getElementById('status-modal').remove(); window.location.reload();" class="btn-status-action" style="background: linear-gradient(90deg, ${color}, #444); color: white;">${
    isSuccess ? "تم" : "إغلاق"
  }</button>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);
};

function injectFeatureModal() {
  const old = document.getElementById("feature-modal-overlay");
  if (old) old.remove();

  const html = `
        <div id="feature-modal-overlay" class="glass-modal-overlay" style="z-index: 10001;">
            <div class="glass-card">
                <span class="close-modal" onclick="document.getElementById('feature-modal-overlay').style.display='none'" style="position:absolute; top:15px; right:20px; color:#aaa; font-size:1.5rem; cursor:pointer;">&times;</span>
                <div class="crown-3d-container"><i class="fas fa-crown"></i></div>
                <h2 style="color: white; margin-bottom: 10px; font-weight:800; letter-spacing:1px;">باقات التميز</h2>
                <p style="color: #ccc; font-size: 0.9rem; margin-bottom: 25px; line-height:1.6;">ميز عقارك ليظهر في المقدمة ويحقق 5 أضعاف المشاهدات. 🚀</p>
                
                <div style="text-align: right;">
                    <input type="radio" name="feature_plan" id="plan1" value="1" class="plan-radio-input" checked>
                    <label for="plan1" class="plan-radio-label">
                        <div style="display:flex; align-items:center; gap:10px;"><i class="fas fa-calendar-alt" style="color:#FFD700;"></i><div><strong style="display:block; color:white;">أسبوعين (14 يوم)</strong><span style="font-size:0.8rem; color:#aaa;">بداية قوية لبيع أسرع</span></div></div>
                        <span style="color:#FFD700; font-weight:bold; font-size:1.1rem;">20 نقطة</span>
                    </label>

                    <input type="radio" name="feature_plan" id="plan2" value="2" class="plan-radio-input">
                    <label for="plan2" class="plan-radio-label">
                        <div style="display:flex; align-items:center; gap:10px;"><i class="fas fa-calendar-check" style="color:#FFD700;"></i><div><strong style="display:block; color:white;">شهر كامل (30 يوم)</strong><span style="font-size:0.8rem; color:#aaa;">الأكثر طلباً ومبيعاً</span></div></div>
                        <span style="color:#FFD700; font-weight:bold; font-size:1.1rem;">30 نقطة</span>
                    </label>

                    <input type="radio" name="feature_plan" id="plan3" value="3" class="plan-radio-input">
                    <label for="plan3" class="plan-radio-label">
                        <div style="display:flex; align-items:center; gap:10px;"><i class="fas fa-fire" style="color:#ff4444;"></i><div><strong style="display:block; color:white;">6 أسابيع (عرض خاص)</strong><span style="font-size:0.8rem; color:#aaa;">أقصى ظهور وضمان وصول</span></div></div>
                        <span style="color:#FFD700; font-weight:bold; font-size:1.1rem;">45 نقطة</span>
                    </label>
                </div>

                <button onclick="submitFeatureRequest()" class="btn-gold-3d">تفعيل التميز الآن <i class="fas fa-arrow-left" style="margin-right:5px;"></i></button>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", html);
}

window.openFeatureModal = (propId) => {
  window.currentFeaturePropId = propId;
  const modal = document.getElementById("feature-modal-overlay");
  if (modal) modal.style.display = "flex";
};

window.submitFeatureRequest = async () => {
  const selected = document.querySelector('input[name="feature_plan"]:checked');
  if (!selected) return alert("اختر باقة");
  const planId = selected.value;
  const propId = window.currentFeaturePropId;
  const btn = document.querySelector(
    'button[onclick="submitFeatureRequest()"]'
  );

  if (!confirm("سيتم خصم قيمة الباقة من رصيدك فوراً. هل أنت متأكد؟")) return;

  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التفعيل...';
  btn.disabled = true;

  try {
    const res = await fetch("/api/user/feature-property", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: propId, planId: planId }),
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById("feature-modal-overlay").style.display = "none";
      window.showStatusModal("success", "تم التمييز بنجاح! 🌟", data.message);
    } else {
      if (res.status === 402) alert("❌ " + data.message + "\nيرجى شحن رصيدك.");
      else alert("❌ خطأ: " + data.message);
    }
  } catch (err) {
    console.error(err);
    alert("خطأ في الاتصال");
  } finally {
    btn.innerHTML = 'تفعيل التميز الآن <i class="fas fa-arrow-left"></i>';
    btn.disabled = false;
  }
};
window.submitUserReport = async () => {
  const reason = document.getElementById("report-reason").value;
  const btn = document.querySelector("#report-modal button");

  const reportedPhone = window.currentProperty
    ? window.currentProperty.sellerPhone
    : null;

  if (!reportedPhone) return alert("خطأ في تحديد المستخدم");

  btn.innerHTML = "جاري الإرسال...";
  btn.disabled = true;

  try {
    const res = await fetch("/api/report-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedPhone, reason }),
    });
    const data = await res.json();
    if (res.ok) {
      alert("✅ " + data.message);
      window.location.href = "home";
    } else {
      alert("❌ " + data.message);
    }
  } catch (e) {
    alert("خطأ في الاتصال");
  } finally {
    btn.innerHTML = "تأكيد الإبلاغ";
    btn.disabled = false;
    document.getElementById("report-modal").style.display = "none";
  }
};

let selectedRating = 0;

window.openRateModal = async (phone, name) => {
  const old = document.getElementById("rate-modal");
  if (old) old.remove();

  const html = `
        <div id="rate-modal" class="modal-overlay" style="display:flex; z-index:10002; backdrop-filter: blur(10px); background: rgba(0,0,0,0.85);">
            <div class="modal-content" style="background: linear-gradient(145deg, #1a1a1a, #0d0d0d); border: 1px solid #FFD700; border-radius: 20px; padding: 30px; width: 90%; max-width: 450px; box-shadow: 0 0 40px rgba(255, 215, 0, 0.15); text-align: center; position: relative;">
                
                <span class="close-modal" onclick="document.getElementById('rate-modal').remove()" style="position: absolute; top: 15px; left: 15px; color: #666; cursor: pointer; font-size: 1.5rem; transition: 0.3s;">&times;</span>
                
                <div style="width: 60px; height: 60px; background: rgba(255, 215, 0, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; border: 1px solid #FFD700;">
                    <i class="fas fa-star" style="color: #FFD700; font-size: 1.8rem;"></i>
                </div>

                <h3 style="color: white; margin-bottom: 5px; font-family: 'Cairo', sans-serif;">تقييم التجربة</h3>
                <p style="color: #888; font-size: 0.9rem; margin-bottom: 25px;">كيف كانت تجربتك مع ${name}؟</p>
                
                <div id="loading-rate" style="color:#aaa; font-size:0.9rem; padding:10px;">
                    <i class="fas fa-spinner fa-spin"></i> جاري التحميل...
                </div>

                <div id="rate-form-content" style="display:none;">
                    <div class="star-rating-input" style="display:flex; justify-content:center; direction: rtl; gap:8px; font-size:2.2rem; margin-bottom:25px;">
                        <i class="far fa-star" onclick="setRate(1)" id="s1" style="cursor:pointer; transition:0.2s;" title="سيء"></i>
                        <i class="far fa-star" onclick="setRate(2)" id="s2" style="cursor:pointer; transition:0.2s;" title="مقبول"></i>
                        <i class="far fa-star" onclick="setRate(3)" id="s3" style="cursor:pointer; transition:0.2s;" title="جيد"></i>
                        <i class="far fa-star" onclick="setRate(4)" id="s4" style="cursor:pointer; transition:0.2s;" title="جيد جداً"></i>
                        <i class="far fa-star" onclick="setRate(5)" id="s5" style="cursor:pointer; transition:0.2s;" title="ممتاز"></i>
                    </div>

                    <textarea id="rate-comment" rows="3" placeholder="اكتب تعليقك هنا (اختياري)..." 
                        style="width:100%; margin-bottom:20px; background: rgba(255,255,255,0.05); color:white; border: 1px solid #333; padding: 15px; border-radius: 12px; font-family: 'Cairo', sans-serif; resize: none; outline: none; transition: 0.3s;"></textarea>
                    
                    <button onclick="submitRate('${phone}')" style="width:100%; background: linear-gradient(45deg, #FFD700, #FFA500); color:black; border:none; padding: 14px; border-radius: 50px; font-weight:bold; font-size: 1rem; cursor:pointer; box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3); transition: transform 0.2s;">
                        إرسال التقييم
                    </button>
                </div>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", html);

  const textarea = document.getElementById("rate-comment");
  if (textarea) {
    textarea.onfocus = () => (textarea.style.borderColor = "#FFD700");
    textarea.onblur = () => (textarea.style.borderColor = "#333");
  }
  const closeBtn = document.querySelector(".close-modal");
  if (closeBtn) {
    closeBtn.onmouseover = () => (closeBtn.style.color = "#ff4444");
    closeBtn.onmouseout = () => (closeBtn.style.color = "#666");
  }

  selectedRating = 0;

  try {
    const res = await fetch(`/api/reviews/my-rating/${phone}`);
    const data = await res.json();

    const loader = document.getElementById("loading-rate");
    const content = document.getElementById("rate-form-content");

    if (loader) loader.style.display = "none";
    if (content) content.style.display = "block";

    if (data.found) {
      window.setRate(data.rating);
    }
  } catch (e) {
    console.error("Error fetching rating:", e);
    const loader = document.getElementById("loading-rate");
    if (loader) loader.style.display = "none";
    const content = document.getElementById("rate-form-content");
    if (content) content.style.display = "block";
  }
};

window.submitRate = async (phone) => {
  if (selectedRating === 0) return alert("يرجى اختيار عدد النجوم");

  const comment = document.getElementById("rate-comment").value;
  const btn = document.querySelector("#rate-modal button");
  btn.innerHTML = "جاري الإرسال...";
  btn.disabled = true;

  try {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewedPhone: phone,
        rating: selectedRating,
        comment,
      }),
    });
    const data = await res.json();

    if (res.status === 403 && data.errorType === "LIMIT_EXCEEDED") {
      document.getElementById("rate-modal").remove();
      const refusalHTML = `
            <div id="refusal-modal" class="refusal-modal-overlay" onclick="this.remove()">
                <div class="refusal-content">
                    <div class="hand-icon-anim"><i class="fas fa-hand-paper"></i></div>
                    <div class="refusal-text">
                        <h2 style="color:#ff4444; margin:0;">كفاية كده!</h2>
                        <p style="color:#ccc; font-size:1.1rem; margin-top:10px;">مينفعش تكتب أكتر من 5 تعليقات لنفس الشخص.</p>
                        <p style="font-size:0.9rem; color:#888;">(تم تحديث النجوم فقط)</p>
                    </div>
                </div>
            </div>
        `;
      document.body.insertAdjacentHTML("beforeend", refusalHTML);
      return;
    }

    if (res.ok) {
      alert(data.message);
      document.getElementById("rate-modal").remove();
      location.reload();
    } else {
      alert("❌ " + data.message);
      btn.innerHTML = "إرسال التقييم";
      btn.disabled = false;
    }
  } catch (e) {
    alert("خطأ في الاتصال");
    btn.disabled = false;
  }
};
window.setRate = (n) => {
  selectedRating = n;
  for (let i = 1; i <= 5; i++) {
    const star = document.getElementById("s" + i);
    if (i <= n) {
      star.classList.remove("far");
      star.classList.add("fas");
      star.classList.add("active");
    } else {
      star.classList.remove("fas");
      star.classList.add("far");
      star.classList.remove("active");
    }
  }
};

window.handleWhatsappClick = async (link, ownerPhone) => {
  if (ownerPhone) {
    fetch("/api/log-contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerPhone }),
    }).catch((e) => console.log(e));
  }

  window.open(link, "_blank");
};

window.showWarningAnim = (title, msg) => {
  const oldW = document.getElementById("luxury-warning-modal");
  if (oldW) oldW.remove();

  const styleId = "luxury-warning-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
        @keyframes luxuryEntrance {
            0% { transform: scale(0.7) translateY(50px); opacity: 0; filter: blur(10px); }
            60% { transform: scale(1.05) translateY(-10px); opacity: 1; filter: blur(0); }
            100% { transform: scale(1) translateY(0); }
        }
        @keyframes glowPulse {
            0% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.1); }
            50% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.3); }
            100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.1); }
        }
        .luxury-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            z-index: 99999;
            display: flex; align-items: center; justify-content: center;
        }
        .luxury-box {
            background: linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%);
            border: 1px solid #FFD700;
            border-radius: 20px;
            padding: 40px 30px;
            text-align: center;
            width: 90%;
            max-width: 350px;
            position: relative;
            animation: luxuryEntrance 0.6s cubic-bezier(0.22, 1, 0.36, 1);
            box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        }
        .luxury-icon-ring {
            width: 80px; height: 80px;
            border: 2px solid #FFD700;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 20px auto;
            animation: glowPulse 2s infinite;
            background: rgba(255, 215, 0, 0.05);
        }
        .luxury-icon {
            color: #FFD700;
            font-size: 35px;
        }
        .luxury-btn {
            background: linear-gradient(45deg, #FFD700, #FFA500);
            color: #000;
            border: none; padding: 12px 35px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 1rem;
            margin-top: 25px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 5px 15px rgba(255, 215, 0, 0.2);
        }
        .luxury-btn:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 8px 20px rgba(255, 215, 0, 0.4);
        }
      `;
    document.head.appendChild(style);
  }

  const html = `
    <div id="luxury-warning-modal" class="luxury-overlay" onclick="if(event.target === this) this.remove()">
        <div class="luxury-box">
            <div class="luxury-icon-ring">
                <i class="fas fa-hand-paper luxury-icon"></i>
            </div>
            <h3 style="color: #fff; margin: 0 0 10px 0; font-family: 'Cairo', sans-serif;">${title}</h3>
            <p style="color: #aaa; font-size: 0.95rem; margin: 0; line-height: 1.6;">${msg}</p>
            <button class="luxury-btn" onclick="document.getElementById('luxury-warning-modal').remove()">حسناً، فهمت</button>
        </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
};
let map3DInstance = null;
let map3DMode = "3d";
let map3DStyle = "satellite";
let currentLat, currentLng;
let MAPBOX_TOKEN = "";

const MAP_STYLES = {
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  dark: "mapbox://styles/mapbox/dark-v11",
  night: "mapbox://styles/mapbox/navigation-night-v1"
};

async function loadMapboxToken() {
  try {
    const res = await fetch("/api/mapbox-token");
    const data = await res.json();
    MAPBOX_TOKEN = data.token;
  } catch (e) {
    console.error("Failed to load Mapbox token");
  }
}

function add3DBuildings(map) {
  if (map.getLayer("3d-buildings")) return;
  const layers = map.getStyle().layers;
  let labelLayerId;
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].type === "symbol" && layers[i].layout["text-field"]) {
      labelLayerId = layers[i].id;
      break;
    }
  }
  map.addLayer({
    id: "3d-buildings",
    source: "composite",
    "source-layer": "building",
    filter: ["==", "extrude", "true"],
    type: "fill-extrusion",
    minzoom: 14,
    paint: {
      "fill-extrusion-color": [
        "interpolate", ["linear"], ["get", "height"],
        0, "#1a1a2e",
        50, "#16213e",
        100, "#0f3460",
        200, "#533483"
      ],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": ["get", "min_height"],
      "fill-extrusion-opacity": 0.85
    }
  }, labelLayerId);
}

async function initMap3D(lat, lng) {
  const section = document.getElementById("map3d-section");
  if (!section) return;
  section.style.display = "block";
  currentLat = lat;
  currentLng = lng;

  await loadMapboxToken();
  if (!MAPBOX_TOKEN) return;

  mapboxgl.accessToken = MAPBOX_TOKEN;

  map3DInstance = new mapboxgl.Map({
    container: "map3d-container",
    style: MAP_STYLES.satellite,
    center: [lng, lat],
    zoom: 15,
    pitch: 60,
    bearing: -17.6,
    antialias: true
  });

  map3DInstance.addControl(new mapboxgl.NavigationControl(), "top-left");

  map3DInstance.on("load", () => {
    map3DInstance.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14
    });
    map3DInstance.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

    map3DInstance.addLayer({
      id: "sky",
      type: "sky",
      paint: {
        "sky-type": "atmosphere",
        "sky-atmosphere-sun": [0.0, 0.0],
        "sky-atmosphere-sun-intensity": 15
      }
    });

    add3DBuildings(map3DInstance);

    new mapboxgl.Marker({ color: "#00ff88" })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML("<b>موقع العقار</b>"))
      .addTo(map3DInstance);
  });
}

window.resetMap3D = function () {
  if (map3DInstance) {
    map3DInstance.resetNorthPitch();
  }
};

window.toggleMap3DMode = function () {
  if (!map3DInstance) return;
  if (map3DMode === "3d") {
    map3DInstance.easeTo({ pitch: 0, duration: 1000 });
    map3DMode = "2d";
  } else {
    map3DInstance.easeTo({ pitch: 60, bearing: -17.6, duration: 1000 });
    map3DMode = "3d";
  }
};

window.toggleMap3DStyle = function () {
  if (!map3DInstance) return;
  const styles = Object.keys(MAP_STYLES);
  const currentIndex = styles.indexOf(map3DStyle);
  map3DStyle = styles[(currentIndex + 1) % styles.length];
  map3DInstance.setStyle(MAP_STYLES[map3DStyle]);
  map3DInstance.once("style.load", () => {
    map3DInstance.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14
    });
    map3DInstance.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
    add3DBuildings(map3DInstance);
  });
  const btn = document.getElementById("style-toggle-btn");
  if (btn) {
    const labels = { satellite: "فاضي", dark: "داكن", night: "ليلي" };
    btn.innerHTML = `<i class="fas fa-palette"></i> ${labels[map3DStyle]}`;
  }
};