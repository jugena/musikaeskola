import re

def create_noticia(source, target):
    with open(source, 'r') as f:
        content = f.read()
    
    # Remove hero section
    content = re.sub(r'<section class="hero".*?</section>', '', content, flags=re.DOTALL)
    # Remove dynamic sections
    content = re.sub(r'<main>.*?</main>', '<main style="padding: 4rem 2rem; min-height: 60vh;"><div id="news-detail-container"></div></main>', content, flags=re.DOTALL)
    
    # Ensure title is appropriate
    content = content.replace('<title>Erandioko Musika Eskola | Inicio</title>', '<title>Erandioko Musika Eskola | Noticia</title>')
    content = content.replace('<title>Erandioko Musika Eskola | Hasiera</title>', '<title>Erandioko Musika Eskola | Berria</title>')
    
    with open(target, 'w') as f:
        f.write(content)

create_noticia('/Users/jabierugena/Desktop/MusikaEskola/index.html', '/Users/jabierugena/Desktop/MusikaEskola/noticia.html')
create_noticia('/Users/jabierugena/Desktop/MusikaEskola/index-eu.html', '/Users/jabierugena/Desktop/MusikaEskola/noticia-eu.html')

