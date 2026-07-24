document.addEventListener("DOMContentLoaded", () => {
  fetchSubmissions();
});

async function fetchSubmissions() {
  const container = document.getElementById("submissions-container");
  container.innerHTML =
    '<p class="empty-message" style="color:var(--neon-secondary)">جاري تحميل طلبات العرض <i class="fas fa-spinner fa-spin"></i></p>';

  try {
    const response = await fetch("/api/admin/seller-submissions");
    if (!response.ok) throw new Error("فشل جلب الطلبات");

    const submissions = await response.json();
    container.innerHTML = "";

    if (submissions.length === 0) {
      container.innerHTML = `
                <div class="empty-message success">
                    <i class="fas fa-check-circle" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                    لا توجد طلبات عرض عقارات جديدة حالياً.
                </div>`;
      return;
    }

    submissions.forEach((submission) => {
      const cardHTML = createSubmissionCard(submission);
      container.innerHTML += cardHTML;
    });

    addSubmissionListeners();
  } catch (error) {
    console.error("Submissions Fetch Error:", error);
    container.innerHTML = `<p class="empty-message" style="color:var(--neon-danger)">حدث خطأ: ${error.message}</p>`;
  }
}

function createSubmissionCard(submission) {
  const imagePaths = submission.imagePaths
    ? submission.imagePaths.split(" | ").filter((p) => p.trim() !== "")
    : [];

  const imageThumbnails =
    imagePaths.length > 0
      ? imagePaths
          .map(
            (path) =>
              `<img src="${path}" class="submission-thumbnail" alt="صورة العقار" onclick="window.open(this.src)">`
          )
          .join("")
      : '<span style="color:#777; font-size:0.9rem;">لا توجد صور مرفقة</span>';

  return `
        <div class="submission-card" data-id="${submission.id}">
            
            <div class="submission-header">
                <h3 class="submission-title">${submission.propertyTitle}</h3>
                <span class="submission-type">${submission.propertyType}</span>
            </div>

            <div class="info-grid">
                <div class="info-item"><strong><i class="fas fa-user"></i> المالك:</strong> ${
                  submission.sellerName
                }</div>
                <div class="info-item"><strong><i class="fas fa-phone"></i> الهاتف:</strong> ${
                  submission.sellerPhone
                }</div>
                <div class="info-item"><strong><i class="fas fa-money-bill-wave"></i> السعر:</strong> ${Number(
                  submission.propertyPrice
                ).toLocaleString()} ر.س</div>
                <div class="info-item"><strong><i class="fas fa-ruler-combined"></i> المساحة:</strong> ${
                  submission.propertyArea
                } م²</div>
                <div class="info-item"><strong><i class="fas fa-bed"></i> الغرف:</strong> ${
                  submission.propertyRooms
                }</div>
                <div class="info-item"><strong><i class="fas fa-bath"></i> الحمامات:</strong> ${
                  submission.propertyBathrooms
                }</div>
            </div>

            <p class="submission-desc">
                <strong><i class="fas fa-align-left"></i> الوصف:</strong><br> 
                ${submission.propertyDescription || "لا يوجد وصف."}
            </p>
            
            <div class="gallery-container">
                <h4><i class="fas fa-images"></i> الصور المرفقة (${
                  imagePaths.length
                }):</h4>
                <div class="thumbnails-flex">${imageThumbnails}</div>
            </div>

            <div class="admin-actions">
                <button class="action-btn btn-approve publish-btn" data-id="${
                  submission.id
                }">
                    <i class="fas fa-check-circle"></i> موافقة ونشر
                </button>
                <button class="action-btn btn-delete delete-submission-btn" data-id="${
                  submission.id
                }">
                    <i class="fas fa-trash-alt"></i> حذف ورفض
                </button>
            </div>

        </div>
    `;
}

function addSubmissionListeners() {
  document.querySelectorAll(".delete-submission-btn").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      const submissionId = btn.dataset.id;

      if (
        confirm(
          `⚠️ هل أنت متأكد من حذف طلب العرض رقم ${submissionId}؟\nسيتم حذف الصور نهائياً ولا يمكن التراجع.`
        )
      ) {
        try {
          btn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> جاري الحذف...';
          const response = await fetch(
            `/api/admin/seller-submission/${submissionId}`,
            {
              method: "DELETE",
            }
          );

          if (!response.ok) throw new Error("فشل الحذف");

          const card = document.querySelector(
            `.submission-card[data-id="${submissionId}"]`
          );
          card.style.opacity = "0";
          setTimeout(() => card.remove(), 500);

          setTimeout(() => {
            if (document.querySelectorAll(".submission-card").length <= 1)
              fetchSubmissions();
          }, 600);
        } catch (error) {
          alert(`خطأ في الحذف: ${error.message}`);
          btn.innerHTML = '<i class="fas fa-trash-alt"></i> حذف ورفض';
        }
      }
    });
  });

  document.querySelectorAll(".publish-btn").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      const submissionId = btn.dataset.id;

      const hiddenCode = prompt(
        "🔑 أدخل الكود السري (Hidden Code) لهذا العقار لتمييزه عند النشر:"
      );

      if (!hiddenCode || hiddenCode.trim() === "") {
        alert("الكود السري مطلوب لإتمام عملية النشر.");
        return;
      }

      if (
        confirm(
          `✅ هل توافق على نشر العقار رقم ${submissionId} بالكود: ${hiddenCode}؟`
        )
      ) {
        try {
          btn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> جاري النشر...';

          const response = await fetch("/api/admin/publish-submission", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              submissionId,
              hiddenCode: hiddenCode.trim(),
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "فشل في عملية النشر.");
          }

          alert("تم النشر بنجاح! 🎉");

          const card = document.querySelector(
            `.submission-card[data-id="${submissionId}"]`
          );
          card.style.opacity = "0";
          setTimeout(() => {
            card.remove();
            if (document.querySelectorAll(".submission-card").length === 0)
              fetchSubmissions();
          }, 500);
        } catch (error) {
          alert(`خطأ في النشر: ${error.message}`);
          btn.innerHTML = '<i class="fas fa-check-circle"></i> موافقة ونشر';
        }
      }
    });
  });
}
