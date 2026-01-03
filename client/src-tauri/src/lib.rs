use tauri::Manager;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct WebRTCSignal {
    r#type: String,
    sdp: Option<String>,
    candidate: Option<String>,
    sdp_m_line_index: Option<u16>,
    sdp_mid: Option<String>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn check_webrtc_support() -> Result<bool, String> {
    // WebKitGTK doesn't support WebRTC natively
    // We'll need to use native Rust WebRTC implementation
    // For now, return false to indicate WebRTC needs native implementation
    Ok(false)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, check_webrtc_support])
        .setup(|app| {
            #[cfg(target_os = "linux")]
            {
                use webkit2gtk::{PermissionRequestExt, WebViewExt};
                
                let window = app.get_webview_window("main").unwrap();
                
                // Enable microphone permission for Linux
                window.with_webview(move |webview| {
                    use glib::translate::{ToGlibPtr, from_glib_none};
                    
                    // Get the raw pointer and cast to webkit2gtk WebView
                    // SAFETY: We know this is a webkit2gtk WebView on Linux
                    unsafe {
                        let webview_ptr: *mut webkit2gtk::ffi::WebKitWebView = webview.inner().to_glib_none().0;
                        let wv: webkit2gtk::WebView = from_glib_none(webview_ptr);
                        
                        // Connect to permission request handler
                        wv.connect_permission_request(|_webview, request| {
                            println!("Permission request received, auto-granting...");
                            request.allow();
                            true
                        });
                    }
                }).ok();
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
