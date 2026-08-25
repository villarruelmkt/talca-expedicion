[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$js = Get-Content 'app.js' -Raw
$wc = New-Object System.Net.WebClient
$nvc = New-Object System.Collections.Specialized.NameValueCollection
$nvc.Add("js_code", $js)
$nvc.Add("compilation_level", "SIMPLE_OPTIMIZATIONS")
$nvc.Add("output_format", "text")
$nvc.Add("output_info", "compiled_code")
$bytes = $wc.UploadValues("https://closure-compiler.appspot.com/compile", "POST", $nvc)
$compiled = [System.Text.Encoding]::UTF8.GetString($bytes)
$compiled | Out-File -FilePath 'app.min.js' -Encoding utf8
Write-Output "Compilation finished."
