import re
c = open('dashboard/pages/Settings.tsx', encoding='utf-8', errors='ignore').read()
imgs = re.findall(r'<img[^>]+>', c, re.I)
for i, img in enumerate(imgs):
    print('img', i, repr(img))
    print('has_alt:', 'alt=' in img.lower())
    
c2 = open('index.html', encoding='utf-8', errors='ignore').read().lower()
print('index desc:', 'name="description"' in c2, "name='description'" in c2)
print('index og:', 'og:' in c2)
