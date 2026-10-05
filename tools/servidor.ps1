# Servidor web local minimo para jugar Mision EPP sin instalar nada (solo Windows PowerShell).
# La camara del navegador solo funciona en https:// o en http://localhost, por eso se usa este servidor.
param([int]$Puerto = 8000)

$raiz = Split-Path -Parent $PSScriptRoot
$tipos = @{
  '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
  '.json' = 'application/json'; '.wasm' = 'application/wasm'; '.task' = 'application/octet-stream'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'
  '.md' = 'text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Puerto/")
try { $listener.Start() } catch {
  Write-Host "No se pudo abrir el puerto $Puerto. El juego ya esta abierto en otra ventana?" -ForegroundColor Red
  Read-Host "Presiona Enter para salir"; exit 1
}
Write-Host ""
Write-Host "  Mision EPP corriendo en http://localhost:$Puerto" -ForegroundColor Green
Write-Host "  Deja esta ventana abierta mientras juegas. Cierrala para apagar el juego."
Write-Host ""
Start-Process "http://localhost:$Puerto/"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    $ruta = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($ruta -eq '') { $ruta = 'index.html' }
    $archivo = [IO.Path]::GetFullPath((Join-Path $raiz $ruta))
    if ($archivo.StartsWith($raiz) -and (Test-Path $archivo -PathType Leaf)) {
      $ext = [IO.Path]::GetExtension($archivo).ToLower()
      $res.ContentType = if ($tipos.ContainsKey($ext)) { $tipos[$ext] } else { 'application/octet-stream' }
      $bytes = [IO.File]::ReadAllBytes($archivo)
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
    }
  } catch {
    $res.StatusCode = 500
  } finally {
    $res.Close()
  }
}
