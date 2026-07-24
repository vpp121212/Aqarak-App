#!/bin/bash
echo "========================================="
echo "  رفع مشروع أقارك على GitHub"
echo "========================================="
echo ""
echo "1. افتح هذا الرابط في المتصفح:"
echo "   https://github.com/login"
echo ""
echo "2. سجّل دخول بحسابك"
echo ""
echo "3. افتح هذا الرابط لإنشاء Token:"
echo "   https://github.com/settings/tokens/new"
echo ""
echo "4. اختر:"
echo "   - Note: dar-app"
echo "   - Expiration: 90 days"
echo "   - Scopes: علّق على 'repo' فقط"
echo ""
echo "5. اضغط 'Generate token'"
echo ""
echo "6. انسخ التوكن (يبدأ بـ ghp_)"
echo ""
echo "7. الصق التوكن هنا:"
echo ""
read -p "التوكن: " TOKEN
echo ""

if [ -z "$TOKEN" ]; then
  echo "❌ ما الصقت التوكن"
  exit 1
fi

cd /Users/mac/aqarak-app-backup

# Create repo on GitHub
echo "🔄 جاري إنشاء المستودع..."
curl -s -H "Authorization: token $TOKEN" \
  -d '{"name":"Aqarak-App","description":"مشروع أقارك - تطبيق عقاري سعودي","auto_init":false}' \
  https://api.github.com/user/repos > /dev/null 2>&1

# Set remote with token
git remote set-url origin https://$TOKEN@github.com/vpp511/Aqarak-App.git

# Push
echo "🔄 جاري رفع الملفات..."
git push -u origin master 2>&1

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ تم رفع المشروع بنجاح!"
  echo "📎 الرابط: https://github.com/vpp511/Aqarak-App"
  echo ""
else
  echo ""
  echo "❌ فشل الرفع. تحقق من التوكن وحاول مرة أخرى."
fi

# Clean up token from remote
git remote set-url origin https://github.com/vpp511/Aqarak-App.git
