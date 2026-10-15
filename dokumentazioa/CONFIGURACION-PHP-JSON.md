# Configuración PHP + JSON

## Requisitos

- PHP 7.4 o posterior.
- La carpeta `data/` debe tener permiso de escritura para el proceso de PHP.
- La web debe abrirse mediante HTTP/HTTPS, no directamente como `file://`.

## Desarrollo local

El proyecto incluye una instalación portátil de PHP. Desde la raíz puede iniciarse con:

```powershell
.\iniciar-local.ps1
```

También puede hacerse doble clic sobre `iniciar-local.cmd`.

Después, abrir `http://127.0.0.1:8000/backoffice.html`.

## Publicación

Subir mediante FTP, como mínimo, estas rutas junto con los HTML, CSS y JavaScript:

- `api/content.php`
- `api/upload.php`
- `data/*.json`
- `data/.htaccess`
- `audio/podcasts/*.mp3`
- `img/podcasts/` (portadas subidas, cuando existan)

El usuario del servidor web debe poder modificar los archivos de `data/`.

## Podcast

El backoffice permite subir MP3 (hasta 100 MB) y portadas JPG, PNG o WebP (hasta 10 MB), o indicar una ruta existente. Las subidas se guardan con nombres aleatorios en `audio/podcasts/` e `img/podcasts/`; PHP necesita permiso de escritura en estas carpetas (o en sus carpetas padre para crearlas). No es necesario usar FTP para cada episodio.

Configurar en el alojamiento `upload_max_filesize=100M` y `post_max_size=110M`, y un tiempo de ejecución/subida suficiente. El lanzador local ya aplica los límites de tamaño. Un proxy del alojamiento también puede imponer su propio límite.

Subir el archivo no publica el episodio: hay que guardar su ficha. Los borradores y las fechas futuras no se entregan mediante la API pública; el administrador puede editarlos. Dos sesiones no pueden sobrescribir silenciosamente la misma colección: si aparece un conflicto, copiar los cambios pendientes y recargar la página.

La eliminación de una ficha no borra su MP3 ni su portada, para evitar eliminar archivos compartidos. Incluir `data/`, `audio/podcasts/` e `img/podcasts/` en las copias de seguridad. En servidores sin Apache, bloquear también el acceso directo a `data/`.

## Contraseña

La clave inicial del backoffice continúa siendo `erandio2026`, pero ahora se valida en PHP y no aparece en el JavaScript del navegador.

En producción se recomienda definir la variable de entorno `MUSIKA_ADMIN_PASSWORD_HASH` con el SHA-256 de una contraseña nueva. Por ejemplo:

```powershell
php -r "echo hash('sha256', 'NUEVA-CONTRASEÑA');"
```

## Seguridad de los JSON

En Apache, `data/.htaccess` impide el acceso directo y los datos públicos se entregan a través de `api/content.php`. Si el alojamiento usa Nginx, debe configurarse una regla equivalente que bloquee `/data/`.
