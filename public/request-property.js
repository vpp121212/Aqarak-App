const saudiLocations = {
  الرياض: ["الرياض", "حيدر آباد", "الظهران", "العليا", "الملز", "النسيم", "الروضة", "الفيصلية", "الدانة", "الياسمين", "النرجس", "المحمدية", "السويدي", "حطين", "الغدير", "عرقة", "البديعة", "المروج", "الورود", "الربيع", "النزهة", "الواحة", "العزيزية", "الصفراء", "الخرج", "الدوادمي", "المجمعة", "الزلفي", "المدينة المنورة", "العلا", "ينبع", "الحناكية"],
  جدة: ["جدة", "الشاطئ", "الفيصلية", "أبحر", "الحمرا", "الروضة", "الصالحية", "النخيل", "المرجان", "السنابل", "النعيم"],
  "مكة المكرمة": ["مكة المكرمة", "العزيزية", "العمرة", "النسيم", "الزاهر", "الهجرة", "أجياد", "الشفا", "التنعيم"],
  الدمام: ["الدمام", "الظهران", "الخبر", "القطيف", "سيهات", "تاروت", "الجبيل"],
  الطائف: ["الطائف", "الهدا", "الروضة", "العقيق"],
  أبها: ["أبها", "خميس مشيط", "النماص", "بيشة", "تنومة"],
  تبوك: ["تبوك", "العلا", "ضباء"],
  حائل: ["حائل", "بقعاء", "الحائط"],
  نجران: ["نجران", "صبيا", "شرورة"],
};

document.addEventListener("DOMContentLoaded", () => {
  initLocationSelects();

  fetchUserData();

  const form = document.getElementById("request-form");
  if (form) {
    form.addEventListener("submit", handleRequestSubmit);
  }
});

function initLocationSelects() {
  const govSelect = document.getElementById("req-gov");
  const citySelect = document.getElementById("req-city");

  govSelect.innerHTML = '<option value="">اختر المحافظة...</option>';

  Object.keys(saudiLocations).forEach((gov) => {
    const option = document.createElement("option");
    option.value = gov;
    option.textContent = gov;
    govSelect.appendChild(option);
  });

  govSelect.addEventListener("change", function () {
    const selectedGov = this.value;
    citySelect.innerHTML = '<option value="">اختر المدينة / المركز...</option>';

    if (selectedGov && saudiLocations[selectedGov]) {
      saudiLocations[selectedGov].forEach((city) => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
      });
    }
  });
}

async function fetchUserData() {
  try {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      if (data.isAuthenticated) {
        const nameInput = document.getElementById("req-name");
        const phoneInput = document.getElementById("req-phone");

        if (nameInput && data.name) nameInput.value = data.name;
        if (phoneInput && data.phone) phoneInput.value = data.phone;
      }
    }
  } catch (e) {}
}

async function handleRequestSubmit(e) {
  e.preventDefault();

  const btn = e.target.querySelector('button[type="submit"]');
  const originalContent = btn.innerHTML;

  const formData = {
    name: document.getElementById("req-name")?.value.trim(),
    phone: document.getElementById("req-phone")?.value.trim(),
    type: document.getElementById("req-type")?.value,
    maxPrice: document.getElementById("req-price")?.value,
    governorate: document.getElementById("req-gov")?.value,
    city: document.getElementById("req-city")?.value,
    specifications: document.getElementById("req-notes")?.value.trim(),
  };

  if (
    !formData.name ||
    !formData.phone ||
    !formData.governorate ||
    !formData.city
  ) {
    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "warning",
        title: "بيانات ناقصة",
        text: "يرجى التأكد من اختيار المحافظة والمدينة ورقم الهاتف.",
        confirmButtonText: "حسناً",
        confirmButtonColor: "#d33",
      });
    } else {
      alert("يرجى ملء جميع الحقول المطلوبة (الاسم، الهاتف، الموقع)");
    }
    return;
  }

  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
  btn.disabled = true;

  try {
    const response = await fetch("/api/request-property", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      if (typeof Swal !== "undefined") {
        await Swal.fire({
          icon: "success",
          title: "تم تسجيل طلبك!",
          text: "سنقوم بالبحث في شبكتنا وإبلاغك فور توفر عقار مناسب.",
          confirmButtonText: "العودة للرئيسية",
          confirmButtonColor: "#00ff88",
          background: "#111",
          color: "#fff",
        });
      } else {
        alert("✅ تم تسجيل طلبك بنجاح!");
      }

      window.location.href = "/home";
    } else {
      throw new Error(result.message || "فشل التسجيل");
    }
  } catch (error) {
    console.error("Submission Error:", error);

    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى.",
        confirmButtonText: "حاول مرة أخرى",
      });
    } else {
      alert("❌ حدث خطأ في الاتصال بالسيرفر.");
    }
  } finally {
    btn.innerHTML = originalContent;
    btn.disabled = false;
  }
}
