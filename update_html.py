import re

def update_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # 1. Update image field to file upload
    content = re.sub(
        r'<div class="form-group">\s*<label for="news-img">.*?</label>\s*<input type="url" id="news-img">\s*</div>',
        '''<div class="form-group">
                            <label for="news-img-file">Imagen Principal / Irudi Nagusia</label>
                            <input type="file" id="news-img-file" accept="image/*" style="background: rgba(255,255,255,0.1); padding: 0.5rem; color: white; width: 100%; border-radius: 6px; margin-bottom: 0.5rem;">
                            <input type="hidden" id="news-img">
                            <div id="news-img-preview" style="height: 100px; width: 100%; background-size: contain; background-position: left center; background-repeat: no-repeat; display: none;"></div>
                        </div>''',
        content, flags=re.DOTALL
    )

    # 2. Add Entradilla / Summary fields
    if 'news-summary' not in content:
        content = re.sub(
            r'(<div class="form-group full-width">\s*<div[^>]*>\s*<label[^>]*>)(Resumen \(ES\)|Laburpena \(EU\))(</label>)',
            '''<div class="form-group full-width">
                            <label for="news-summary" style="display:block; margin-bottom:0.5rem; color:white;">Entradilla / Resumen Breve (ES)</label>
                            <textarea id="news-summary" rows="3" style="width: 100%; padding: 0.8rem; border-radius: 6px; border: none; margin-bottom: 1rem;" required></textarea>
                        </div>
                        <div class="form-group full-width">
                            <label for="news-summary-eu" style="display:block; margin-bottom:0.5rem; color:white;">Sarrera / Laburpen Laburra (EU)</label>
                            <textarea id="news-summary-eu" rows="3" style="width: 100%; padding: 0.8rem; border-radius: 6px; border: none; margin-bottom: 1rem;" required></textarea>
                        </div>
                        \\1Noticia Completa / Eduki Osoa (ES)\\3''',
            content, count=1, flags=re.DOTALL
        )
        content = re.sub(
            r'(<div class="form-group full-width">\s*<div[^>]*>\s*<label[^>]*>)(Resumen \(ES\)|Laburpena \(EU\))(</label>)',
            r'\1Noticia Completa / Eduki Osoa (EU)\3',
            content, flags=re.DOTALL
        )

    with open(filename, 'w') as f:
        f.write(content)

update_file('/Users/jabierugena/Desktop/MusikaEskola/backoffice.html')
update_file('/Users/jabierugena/Desktop/MusikaEskola/backoffice-eu.html')
