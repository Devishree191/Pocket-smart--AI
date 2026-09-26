# PocketSmart AI Local Web Server
$port = 8000
$root = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "  PocketSmart AI Server is LIVE at http://127.0.0.1:$port" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to start listener on port $port : $_" -ForegroundColor Red
    exit 1
}

$mimeTypes = @{
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath.TrimStart('/')
        
        # Route mapping
        if ([string]::IsNullOrWhiteSpace($path) -or $path -eq "index.html") {
            $filePath = Join-Path $root "index.html"
        } elseif ($path -eq "dashboard") {
            $filePath = Join-Path $root "templates\dashboard.html"
        } elseif ($path -eq "home-planner") {
            $filePath = Join-Path $root "templates\home_planner.html"
        } elseif ($path -eq "party-planner") {
            $filePath = Join-Path $root "templates\party_planner.html"
        } elseif ($path -eq "jewelry-planner") {
            $filePath = Join-Path $root "templates\jewelry_planner.html"
        } elseif ($path -eq "history") {
            $filePath = Join-Path $root "templates\history.html"
        } elseif ($path -eq "login") {
            $filePath = Join-Path $root "templates\login.html"
        } elseif ($path -eq "register") {
            $filePath = Join-Path $root "templates\register.html"
        } elseif ($path -eq "logout") {
            $response.Redirect("/login")
            $response.Close()
            continue
        } else {
            $filePath = Join-Path $root ($path.Replace('/', '\'))
        }

        # Check if file exists
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $response.ContentType = $mime
            
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 Not Found - PocketSmart AI</h1>")
            $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
        }
        $response.Close()
    } catch {
        # Keep listening on error
    }
}
