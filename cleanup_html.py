import re

def cleanup(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    # Remove the redundant html-editor textareas
    content = re.sub(r'<textarea id="html-editor-(es|eu)".*?</textarea>', '', content, flags=re.DOTALL)
    
    with open(filename, 'w') as f:
        f.write(content)

cleanup('/Users/jabierugena/Desktop/MusikaEskola/backoffice.html')
cleanup('/Users/jabierugena/Desktop/MusikaEskola/backoffice-eu.html')
