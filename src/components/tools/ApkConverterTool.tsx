import React, { useState } from 'react';
import { Smartphone, Globe, Code, Download, Copy, Check, Eye, Play, Sparkles, ExternalLink, ShieldCheck, Layers } from 'lucide-react';
import JSZip from 'jszip';
import { useHaptic } from '../../hooks/useHaptic';

export const ApkConverterTool: React.FC = () => {
  const { triggerHaptic, successHaptic } = useHaptic();

  // Mode: 'url' or 'code'
  const [mode, setMode] = useState<'url' | 'code'>('url');

  // URL Mode State
  const [webUrl, setWebUrl] = useState('https://example.com');
  const [appName, setAppName] = useState('My Web App');
  const [packageId, setPackageId] = useState('com.mycompany.app');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [themeColor, setThemeColor] = useState('#2563eb');
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  // Code Mode State
  const [htmlCode, setHtmlCode] = useState(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Mobile App</title>
</head>
<body>
  <div class="card">
    <h1>📱 Welcome to My App</h1>
    <p>This is a mobile app created from HTML, CSS & JavaScript!</p>
    <button id="clickBtn">Tap Me!</button>
    <div id="counter">Taps: 0</div>
  </div>
</body>
</html>`
  );

  const [cssCode, setCssCode] = useState(
    `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: linear-gradient(135deg, #1e293b, #0f172a);
  color: #fff;
  min-height: 100vh;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1rem;
}
.card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  max-width: 320px;
  width: 100%;
}
h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
p { font-size: 0.9rem; opacity: 0.8; margin-bottom: 1.5rem; }
button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.1s, background 0.2s;
}
button:active { transform: scale(0.95); }
#counter { margin-top: 1rem; font-weight: bold; color: #60a5fa; }`
  );

  const [jsCode, setJsCode] = useState(
    `let count = 0;
const btn = document.getElementById('clickBtn');
const counter = document.getElementById('counter');

btn.addEventListener('click', () => {
  count++;
  counter.textContent = 'Taps: ' + count;
  if (navigator.vibrate) navigator.vibrate(25);
});`
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'html' | 'css' | 'js'>('html');

  // Handle icon file selection
  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setIconPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Compile HTML for preview
  const getCompiledHtml = () => {
    if (mode === 'url') {
      return `<iframe src="${webUrl}" style="width:100%;height:100%;border:none;"></iframe>`;
    }
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${cssCode}</style>
</head>
<body>
  ${htmlCode.replace(/<!DOCTYPE html>|<\/?html>|<\/?head>|<\/?body>/gi, '')}
  <script>${jsCode}<\/script>
</body>
</html>`;
  };

  // Generate full Android Project Package (ZIP with AndroidManifest, WebView MainActivity, Gradle, HTML)
  const handleGeneratePackage = async () => {
    try {
      setIsGenerating(true);
      triggerHaptic(20);

      const zip = new JSZip();
      const sanitizedAppName = appName.replace(/[^a-zA-Z0-9]/g, '');
      const sanitizedPackage = packageId.toLowerCase().replace(/[^a-z0-9.]/g, '') || 'com.myapp.app';
      const packagePath = sanitizedPackage.replace(/\./g, '/');

      // 1. AndroidManifest.xml
      const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${sanitizedPackage}"
    android:versionCode="1"
    android:versionName="${appVersion}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${appName}"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:hardwareAccelerated="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
      zip.file('app/src/main/AndroidManifest.xml', manifestXml);

      // 2. MainActivity.java (Complete Android WebView Wrapper with JS enabled & offline support)
      const mainActivityJava = `package ${sanitizedPackage};

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;

public class MainActivity extends Activity {
    private WebView mWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        mWebView = new WebView(this);
        setContentView(mWebView);

        WebSettings webSettings = mWebView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);

        mWebView.setWebViewClient(new WebViewClient());
        mWebView.setWebChromeClient(new WebChromeClient());

        ${
          mode === 'url'
            ? `mWebView.loadUrl("${webUrl}");`
            : `mWebView.loadUrl("file:///android_asset/www/index.html");`
        }
    }

    @Override
    public void onBackPressed() {
        if (mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}`;
      zip.file(`app/src/main/java/${packagePath}/MainActivity.java`, mainActivityJava);

      // 3. Web Assets (index.html, styles, scripts)
      const compiledHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <meta name="theme-color" content="${themeColor}">
  <title>${appName}</title>
  <style>
${cssCode}
  </style>
</head>
<body>
${htmlCode.replace(/<!DOCTYPE html>|<\/?html>|<\/?head>|<\/?body>/gi, '')}
  <script>
${jsCode}
  </script>
</body>
</html>`;

      zip.file('app/src/main/assets/www/index.html', mode === 'code' ? compiledHtml : `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${webUrl}"></head><body>Redirecting to app...</body></html>`);

      // 4. Web Manifest
      const webManifest = {
        name: appName,
        short_name: appName.slice(0, 12),
        start_url: '/',
        display: 'standalone',
        background_color: themeColor,
        theme_color: themeColor,
        icons: [
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      };
      zip.file('app/src/main/assets/www/manifest.json', JSON.stringify(webManifest, null, 2));

      // 5. Build Gradle
      const buildGradle = `apply plugin: 'com.android.application'

android {
    compileSdkVersion 34
    defaultConfig {
        applicationId "${sanitizedPackage}"
        minSdkVersion 28 // Android 9.0 (Pie)
        targetSdkVersion 34
        versionCode 1
        versionName "${appVersion}"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
}`;
      zip.file('app/build.gradle', buildGradle);

      // 6. Readme with 1-click build instructions
      const readme = `# ${appName} - Android APK Source Package

## How to build your .APK in 2 minutes:

### Method 1: Instant Cloud Build (No Software Needed)
1. Upload this generated zip to WebIntoApp.com or AppsGeyser.com
2. Click "Build APK" to get your ready-to-install .apk file directly!

### Method 2: Android Studio
1. Open Android Studio -> Open -> Select this extracted folder.
2. Click "Build" -> "Build Bundle(s) / APK(s)" -> "Build APK(s)".
3. Your final installable .apk will be in: \`app/build/outputs/apk/debug/app-debug.apk\`!

Enjoy your Android 9+ smooth application!`;
      zip.file('README.md', readme);

      // Generate blob
      const content = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${sanitizedAppName}_Android_Project_v${appVersion}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      successHaptic();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Blogger Standalone Single-File Widget Code
  const bloggerWidgetCode = `<!-- ========================================== -->
<!-- 🚀 WEB & CODE TO APK CONVERTER TOOL WIDGET -->
<!-- Paste this code directly into your Blogger Post (HTML View) or HTML/JavaScript Gadget -->
<!-- ========================================== -->
<div id="apk-converter-app" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 20px auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; overflow: hidden; color: #1e293b;">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 24px; color: white; text-align: center;">
    <h2 style="margin: 0; font-size: 24px; font-weight: 800;">📱 Website &amp; Code to APK Converter</h2>
    <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Convert any Website URL or HTML+CSS+JS code into an Android APK</p>
  </div>

  <!-- Mode Selector Tabs -->
  <div style="display: flex; background: #f1f5f9; padding: 6px; border-bottom: 1px solid #e2e8f0;">
    <button id="btn-mode-url" onclick="switchApkMode('url')" style="flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; background: #ffffff; color: #1e40af; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: all 0.2s;">
      🌐 URL to APK
    </button>
    <button id="btn-mode-code" onclick="switchApkMode('code')" style="flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; background: transparent; color: #64748b; transition: all 0.2s;">
      💻 HTML/CSS/JS to APK
    </button>
  </div>

  <div style="padding: 20px;">
    <!-- URL Section -->
    <div id="section-url">
      <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #475569;">WEBSITE URL *</label>
      <input type="url" id="apk-url" value="https://" placeholder="https://yourwebsite.com" style="width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; margin-bottom: 14px;" />
    </div>

    <!-- Code Section (Hidden by default) -->
    <div id="section-code" style="display: none;">
      <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #475569;">HTML CODE</label>
      <textarea id="apk-html" rows="4" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: monospace; font-size: 12px; margin-bottom: 10px;"><div style="text-align:center;padding:40px;"><h1>My Mobile App</h1><button onclick="alert('Hello!')">Click Me</button></div></textarea>

      <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #475569;">CSS CODE</label>
      <textarea id="apk-css" rows="3" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: monospace; font-size: 12px; margin-bottom: 10px;">body { background: #f8fafc; font-family: sans-serif; color: #1e293b; } button { background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 8px; font-weight: bold; }</textarea>

      <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #475569;">JAVASCRIPT CODE</label>
      <textarea id="apk-js" rows="2" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: monospace; font-size: 12px; margin-bottom: 14px;">console.log("App loaded!");</textarea>
    </div>

    <!-- Common App Settings -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
      <div>
        <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #475569;">APP NAME</label>
        <input type="text" id="apk-name" value="My Web App" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;" />
      </div>
      <div>
        <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #475569;">PACKAGE ID</label>
        <input type="text" id="apk-package" value="com.myblog.app" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;" />
      </div>
    </div>

    <!-- Actions -->
    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
      <button onclick="generateApkZip()" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; border: none; padding: 14px; border-radius: 12px; font-size: 15px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.3); transition: all 0.2s;">
        📦 Download Android Project &amp; APK Files (.zip)
      </button>

      <button onclick="openCloudApkBuilder()" style="background: #10b981; color: white; border: none; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
        ⚡ 1-Click Direct Cloud APK Download
      </button>
    </div>

    <div id="apk-status" style="margin-top: 15px; font-size: 12px; text-align: center; color: #64748b; line-height: 1.5;"></div>
  </div>
</div>

<!-- JSZip Library from CDN (Required for client-side APK package generation) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"><\/script>
<script>
let currentApkMode = 'url';

function switchApkMode(mode) {
  currentApkMode = mode;
  const btnUrl = document.getElementById('btn-mode-url');
  const btnCode = document.getElementById('btn-mode-code');
  const secUrl = document.getElementById('section-url');
  const secCode = document.getElementById('section-code');

  if (mode === 'url') {
    btnUrl.style.background = '#ffffff';
    btnUrl.style.color = '#1e40af';
    btnUrl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
    btnCode.style.background = 'transparent';
    btnCode.style.color = '#64748b';
    btnCode.style.boxShadow = 'none';
    secUrl.style.display = 'block';
    secCode.style.display = 'none';
  } else {
    btnCode.style.background = '#ffffff';
    btnCode.style.color = '#1e40af';
    btnCode.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
    btnUrl.style.background = 'transparent';
    btnUrl.style.color = '#64748b';
    btnUrl.style.boxShadow = 'none';
    secCode.style.display = 'block';
    secUrl.style.display = 'none';
  }
}

async function generateApkZip() {
  const status = document.getElementById('apk-status');
  status.innerHTML = '⏳ Generating Android package and APK structure...';

  try {
    const zip = new JSZip();
    const appName = document.getElementById('apk-name').value || 'MyWebApp';
    const pkg = document.getElementById('apk-package').value || 'com.myblog.app';
    const pkgPath = pkg.replace(/\\./g, '/');

    // 1. AndroidManifest.xml
    const manifest = '<?xml version="1.0" encoding="utf-8"?>\\n' +
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="' + pkg + '" android:versionCode="1" android:versionName="1.0.0">\\n' +
      '  <uses-permission android:name="android.permission.INTERNET" />\\n' +
      '  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\\n' +
      '  <application android:label="' + appName + '" android:theme="@android:style/Theme.NoTitleBar.Fullscreen" android:hardwareAccelerated="true">\\n' +
      '    <activity android:name=".MainActivity" android:exported="true">\\n' +
      '      <intent-filter>\\n' +
      '        <action android:name="android.intent.action.MAIN" />\\n' +
      '        <category android:name="android.intent.category.LAUNCHER" />\\n' +
      '      </intent-filter>\\n' +
      '    </activity>\\n' +
      '  </application>\\n' +
      '</manifest>';
    zip.file('app/src/main/AndroidManifest.xml', manifest);

    // 2. MainActivity.java
    let loadUrlCode = '';
    if (currentApkMode === 'url') {
      const url = document.getElementById('apk-url').value;
      loadUrlCode = 'mWebView.loadUrl("' + url + '");';
    } else {
      loadUrlCode = 'mWebView.loadUrl("file:///android_asset/www/index.html");';
    }

    const javaCode = 'package ' + pkg + ';\\n' +
      'import android.app.Activity;\\nimport android.os.Bundle;\\nimport android.webkit.WebSettings;\\nimport android.webkit.WebView;\\nimport android.webkit.WebViewClient;\\n' +
      'public class MainActivity extends Activity {\\n' +
      '  private WebView mWebView;\\n' +
      '  @Override protected void onCreate(Bundle savedInstanceState) {\\n' +
      '    super.onCreate(savedInstanceState);\\n' +
      '    mWebView = new WebView(this);\\n' +
      '    setContentView(mWebView);\\n' +
      '    WebSettings ws = mWebView.getSettings();\\n' +
      '    ws.setJavaScriptEnabled(true);\\n' +
      '    ws.setDomStorageEnabled(true);\\n' +
      '    mWebView.setWebViewClient(new WebViewClient());\\n' +
      '    ' + loadUrlCode + '\\n' +
      '  }\\n' +
      '  @Override public void onBackPressed() {\\n' +
      '    if (mWebView != null && mWebView.canGoBack()) mWebView.goBack(); else super.onBackPressed();\\n' +
      '  }\\n' +
      '}';
    zip.file('app/src/main/java/' + pkgPath + '/MainActivity.java', javaCode);

    // 3. Web Assets
    if (currentApkMode === 'code') {
      const h = document.getElementById('apk-html').value;
      const c = document.getElementById('apk-css').value;
      const j = document.getElementById('apk-js').value;
      const fullHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>' + c + '</style></head><body>' + h + '<script>' + j + '<\\/script></body></html>';
      zip.file('app/src/main/assets/www/index.html', fullHtml);
    }

    // 4. Readme with instant APK build instructions
    zip.file('README.txt', 'Your Android project is ready! Upload this folder to WebIntoApp.com or open in Android Studio to build the final .apk file in seconds.');

    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = appName.replace(/[^a-zA-Z0-9]/g, '') + '_Android_Package.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    status.innerHTML = '✅ <strong style="color:#10b981;">Android Package Downloaded!</strong> Open in Android Studio or WebIntoApp to compile your .apk file.';
  } catch (e) {
    status.innerHTML = '❌ Error: ' + e.message;
  }
}

function openCloudApkBuilder() {
  let targetUrl = '';
  if (currentApkMode === 'url') {
    targetUrl = document.getElementById('apk-url').value;
  } else {
    alert("For HTML/CSS/JS code, first click 'Download Android Project & APK Files (.zip)' above!");
    return;
  }
  if (!targetUrl || targetUrl === 'https://') {
    alert('Please enter a valid website URL first!');
    return;
  }
  window.open('https://www.webintoapp.com?url=' + encodeURIComponent(targetUrl), '_blank');
}
</script>`;

  const copyWidgetCode = () => {
    navigator.clipboard.writeText(bloggerWidgetCode);
    setIsCopied(true);
    triggerHaptic(15);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 mb-1">
                <Sparkles className="w-3 h-3" /> Blogger & Web Ready
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                URL &amp; Code to APK Converter Tool
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
                Kisi bhi website URL ya HTML + CSS + JS code ko Android APK me convert karein!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={copyWidgetCode}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-blue-800 hover:bg-blue-50 shadow-lg active:scale-95 transition shrink-0"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? 'Code Copied!' : 'Copy Blogger Embed Code'}</span>
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              setMode('url');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              mode === 'url'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Website URL to APK</span>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              setMode('code');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              mode === 'code'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>HTML + CSS + JS to APK</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
            showPreview
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showPreview ? 'Hide Preview' : 'Live Phone Preview'}</span>
        </button>
      </div>

      {/* Main Grid: Inputs + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Inputs (7 or 8 columns) */}
        <div className={showPreview ? 'lg:col-span-7 space-y-5' : 'lg:col-span-12 space-y-5'}>
          {mode === 'url' ? (
            /* URL Mode */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-base flex items-center gap-2 text-slate-900 dark:text-white">
                <Globe className="w-4 h-4 text-blue-600" />
                Target Website Configuration
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Website / Web App URL *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                    placeholder="https://mywebsite.com"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <Globe className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Ye website aapke Android APK me full screen WebView me chalegi.
                </p>
              </div>
            </div>
          ) : (
            /* Code Mode */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base flex items-center gap-2 text-slate-900 dark:text-white">
                  <Code className="w-4 h-4 text-blue-600" />
                  Code Editor (Bundled Inside APK)
                </h3>

                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab('html')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      activeCodeTab === 'html'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab('css')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      activeCodeTab === 'css'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    CSS
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab('js')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      activeCodeTab === 'js'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    JavaScript
                  </button>
                </div>
              </div>

              {activeCodeTab === 'html' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">HTML Structure</label>
                  <textarea
                    rows={8}
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="<div>Your HTML here...</div>"
                  />
                </div>
              )}

              {activeCodeTab === 'css' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">CSS Styling</label>
                  <textarea
                    rows={8}
                    value={cssCode}
                    onChange={(e) => setCssCode(e.target.value)}
                    className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="body { margin: 0; }"
                  />
                </div>
              )}

              {activeCodeTab === 'js' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">JavaScript Logic</label>
                  <textarea
                    rows={8}
                    value={jsCode}
                    onChange={(e) => setJsCode(e.target.value)}
                    className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="console.log('App ready');"
                  />
                </div>
              )}
            </div>
          )}

          {/* App Metadata Configuration */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base flex items-center gap-2 text-slate-900 dark:text-white">
              <Smartphone className="w-4 h-4 text-blue-600" />
              Android Package Info
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  App Name *
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Package ID (Domain)
                </label>
                <input
                  type="text"
                  value={packageId}
                  onChange={(e) => setPackageId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="com.myblog.app"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Version
                </label>
                <input
                  type="text"
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Theme Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="w-10 h-10 p-0 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700"
                  />
                  <input
                    type="text"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Icon Uploader */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                App Icon (PNG / JPG)
              </label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition">
                  <span>Choose App Icon</span>
                  <input type="file" accept="image/*" onChange={handleIconChange} className="hidden" />
                </label>
                {iconPreview ? (
                  <img src={iconPreview} alt="App Icon" className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center font-bold text-xs">
                    APK
                  </div>
                )}
                <span className="text-xs text-slate-400">Default or 512x512 PNG</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGeneratePackage}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 active:scale-98 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Building Package...' : 'Download Android Package (.zip)'}</span>
            </button>

            <a
              href={mode === 'url' ? `https://www.webintoapp.com?url=${encodeURIComponent(webUrl)}` : 'https://www.webintoapp.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25 active:scale-98 transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>1-Click Cloud APK Build</span>
            </a>
          </div>
        </div>

        {/* Right Phone Preview (5 columns if visible) */}
        {showPreview && (
          <div className="lg:col-span-5 sticky top-20 flex flex-col items-center">
            <div className="text-center mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Live Android 9+ Phone Preview</span>
            </div>

            {/* Smartphone Mockup */}
            <div className="w-[280px] sm:w-[320px] h-[560px] bg-slate-900 rounded-[40px] p-3 shadow-2xl border-4 border-slate-800 relative flex flex-col">
              {/* Speaker / Notch */}
              <div className="w-24 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2 flex items-center justify-center">
                <div className="w-8 h-1 bg-slate-700 rounded-full" />
              </div>

              {/* Screen Content */}
              <div className="flex-1 bg-white rounded-[28px] overflow-hidden relative">
                <iframe
                  title="Phone Preview"
                  srcDoc={getCompiledHtml()}
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-modals"
                />
              </div>

              {/* Bottom Home Indicator */}
              <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-2.5" />
            </div>
          </div>
        )}
      </div>

      {/* Blogger Code Embed & Instructions Section */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-500" />
              Blogger Website me Widget Kaise Lagayein? (Step-by-Step Guide)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Is single-file code me HTML + CSS + JS sab kuch pehle se shaamil hai.
            </p>
          </div>

          <button
            type="button"
            onClick={copyWidgetCode}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm active:scale-95 transition"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Widget Code'}</span>
          </button>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Step 1: Blogger Login</span>
            <p>Apne Blogger Dashboard me login karein aur <strong>Layout</strong> ya <strong>Pages/Posts</strong> me jayein.</p>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Step 2: Add HTML/JavaScript</span>
            <p><strong>Add a Gadget</strong> par click karein aur <strong>HTML/JavaScript</strong> widget choose karein (ya Post me HTML view kholein).</p>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Step 3: Paste &amp; Save</span>
            <p>Upar diye gaye <strong>&quot;Copy Widget Code&quot;</strong> button se code copy karke wahan paste karein aur Save kar dein!</p>
          </div>
        </div>

        {/* Code Box */}
        <div className="relative">
          <pre className="p-4 bg-slate-950 text-slate-200 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed border border-slate-800 selection:bg-indigo-500 selection:text-white">
            {bloggerWidgetCode}
          </pre>
        </div>
      </div>
    </div>
  );
};
