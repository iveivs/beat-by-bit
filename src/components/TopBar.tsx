import { type Theme } from "../lib/tracker";

type TopBarProps = {
  appVersion: string;
  displayName: string;
  hasSync: boolean;
  isSignedIn: boolean;
  onAuthClick: () => void;
  onEditProfile: () => void;
  onToggleTheme: () => void;
  syncStatus: string;
  theme: Theme;
  userPhoto: string | null;
};

export function TopBar({
  appVersion,
  displayName,
  hasSync,
  isSignedIn,
  onAuthClick,
  onEditProfile,
  onToggleTheme,
  syncStatus,
  theme,
  userPhoto,
}: TopBarProps) {
  return (
    <section className="topbar" aria-label="Обзор трекера">
      <div>
        <p className="eyebrow">Дневник барабанщика</p>
        <div className="title-row">
          <img
            className="brand-mark"
            src={`./brand-mark.svg?v=${appVersion}`}
            alt=""
          />
          <h1>Beat by Bit</h1>
          <span className="version-badge">v{appVersion}</span>
        </div>
      </div>
      <div className="topbar-actions">
        <button
          className="theme-toggle"
          type="button"
          aria-label={
            theme === "light" ? "Включить тёмную тему" : "Включить светлую тему"
          }
          onClick={onToggleTheme}
        >
          <span className="theme-track" aria-hidden="true">
            <span className="theme-thumb" />
            <span>☀︎</span>
            <span>☾</span>
          </span>
        </button>
        <div className="sync-card">
          {userPhoto ? (
            <img
              className="user-avatar"
              src={userPhoto}
              alt=""
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className={`status-dot ${isSignedIn ? "online" : ""}`} />
          )}
          <div>
            <strong>{displayName}</strong>
            <span>
              {isSignedIn
                ? syncStatus
                : hasSync
                  ? "Email, пароль или Google для синхронизации"
                  : "Данные пока сохраняются в этом браузере"}
            </span>
          </div>
          {hasSync ? (
            <div className="sync-actions">
              {isSignedIn ? (
                <button className="ghost-button" type="button" onClick={onEditProfile}>
                  Профиль
                </button>
              ) : null}
              <button className="ghost-button" type="button" onClick={onAuthClick}>
                {isSignedIn ? "Выйти" : "Вход"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
