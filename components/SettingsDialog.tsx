"use client";

import { useState } from "react";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import { setPrefs, updateProfile, logoutUser, type LibraryState, type ThemeMode } from "../lib/store";
import { pushToast } from "../lib/toast";

export function SettingsDialog({
  open,
  lib,
  onClose,
}: {
  open: boolean;
  lib: LibraryState;
  onClose: () => void;
}) {
  const [name, setName] = useState(lib.user?.name || "");
  const [image, setImage] = useState(lib.user?.image || "");
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    const ok = await updateProfile({ name: name.trim(), image: image.trim() || undefined });
    setSaving(false);
    if (ok) {
      pushToast("Profile updated");
    } else {
      pushToast("Failed to update profile");
    }
  };

  const handleThemeChange = (theme: ThemeMode) => {
    setPrefs({ theme });
    pushToast(`Theme: ${theme}`);
  };

  const handleLogout = async () => {
    await logoutUser();
    onClose();
    pushToast("Signed out");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Settings"
      variant="wide"
      footer={
        <>
          <span className="spacer" />
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="settings-sections">
        {/* Section 1: Account */}
        <section className="settings-section">
          <h3 className="settings-section-title">
            <Icon name="user" size={15} />
            <span>Account</span>
          </h3>

          <div className="settings-avatar-row">
            <div className="settings-avatar-preview">
              {lib.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lib.user.image} alt={lib.user.name} />
              ) : (
                <span>{(lib.user?.name || "U")[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="settings-avatar-info">
              <div className="settings-user-name">{lib.user?.name || "Developer"}</div>
              <div className="settings-user-email">{lib.user?.email || "No email"}</div>
            </div>
          </div>

          <div className="form-grid" style={{ marginTop: 12 }}>
            <label className="field">
              <span className="field-label">Display Name</span>
              <span className="input">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                />
              </span>
            </label>

            <label className="field">
              <span className="field-label">Avatar Image URL</span>
              <span className="input">
                <input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </span>
            </label>

            <div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || (name === lib.user?.name && image === (lib.user?.image || ""))}
                onClick={handleSaveProfile}
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Appearance */}
        <section className="settings-section">
          <h3 className="settings-section-title">
            <Icon name="sun" size={15} />
            <span>Appearance</span>
          </h3>

          <div className="settings-theme-row">
            {(
              [
                { id: "light", label: "Light", icon: "sun" },
                { id: "dark", label: "Dark", icon: "moon" },
                { id: "system", label: "System", icon: "auto" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`settings-theme-btn ${lib.prefs.theme === item.id ? "is-active" : ""}`}
                onClick={() => handleThemeChange(item.id)}
              >
                <Icon name={item.icon} size={16} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Section 3: Interface */}
        <section className="settings-section">
          <h3 className="settings-section-title">
            <Icon name="sidebar" size={15} />
            <span>Interface</span>
          </h3>

          <div className="settings-field-row">
            <div>
              <div className="settings-field-label">Default view mode</div>
              <div className="settings-field-desc">Choose your preferred library layout</div>
            </div>
            <div className="segmented">
              <button
                type="button"
                className="segmented-btn"
                aria-pressed={lib.prefs.viewMode === "grid"}
                onClick={() => setPrefs({ viewMode: "grid" })}
              >
                <Icon name="grid" size={13} />
                <span>Grid</span>
              </button>
              <button
                type="button"
                className="segmented-btn"
                aria-pressed={lib.prefs.viewMode === "list"}
                onClick={() => setPrefs({ viewMode: "list" })}
              >
                <Icon name="list" size={13} />
                <span>List</span>
              </button>
            </div>
          </div>

          <div className="settings-field-row">
            <div>
              <div className="settings-field-label">Sidebar collapsed</div>
              <div className="settings-field-desc">Keep sidebar compact by default</div>
            </div>
            <button
              type="button"
              className={`check ${lib.prefs.sidebarCollapsed ? "is-on" : ""}`}
              onClick={() => setPrefs({ sidebarCollapsed: !lib.prefs.sidebarCollapsed })}
            >
              <span className="check-box">
                {lib.prefs.sidebarCollapsed ? <Icon name="check" size={10} strokeWidth={2.6} /> : null}
              </span>
              <span>Collapsed</span>
            </button>
          </div>
        </section>

        {/* Section 4: Account actions */}
        <section className="settings-section">
          <h3 className="settings-section-title">
            <Icon name="logout" size={15} />
            <span>Session</span>
          </h3>

          <div className="settings-field-row">
            <div>
              <div className="settings-field-label">Sign out</div>
              <div className="settings-field-desc">Sign out of your personal workspace</div>
            </div>
            <button type="button" className="btn btn-quiet" onClick={handleLogout}>
              <Icon name="logout" size={14} />
              <span>Log out</span>
            </button>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
