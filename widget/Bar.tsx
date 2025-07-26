import app from "ags/gtk4/app"
import GLib from "gi://GLib"
import Astal from "gi://Astal?version=4.0"
import Gtk from "gi://Gtk?version=4.0"
import Gdk from "gi://Gdk?version=4.0"
import AstalBattery from "gi://AstalBattery"
import AstalPowerProfiles from "gi://AstalPowerProfiles"
import AstalWp from "gi://AstalWp"
import AstalNetwork from "gi://AstalNetwork"
import AstalTray from "gi://AstalTray"
import AstalMpris from "gi://AstalMpris"
import AstalApps from "gi://AstalApps"
// The deprecated 'bind' utility has been removed.
import { For, With, createBinding } from "ags"
import { createPoll } from "ags/time"
import { execAsync } from "ags/process"
// The Hyprland service is now imported from AstalHyprland for direct integration
import Hyprland from "gi://AstalHyprland"
import Notifd from "gi://AstalNotifd"
import { toggleWallpaperPicker } from "./wallpaperpicker"

function MediaPlayerWindow() {
  const mpris = AstalMpris.get_default();
  const players = createBinding(mpris, "players");
  
  return (
    <window
      name="media-player"
      visible={false}
      exclusivity={Astal.Exclusivity.NORMAL}
      layer={Astal.Layer.TOP}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.CENTER}
      marginTop={10}
      application={app}
      class="media-player-window"
    >
      <For each={players}>
        {(player: any) => (
          <box orientation={Gtk.Orientation.VERTICAL} class="media-player-container">
            {/* Header with close button */}
            <box orientation={Gtk.Orientation.HORIZONTAL} class="media-header">
              <label label="Media Player" class="media-header-title" />
              <box hexpand />
              <button 
                onClicked={() => {
                  const window = app.get_window("media-player");
                  if (window) window.visible = false;
                }}
                class="media-close-btn"
              >
                <image iconName="window-close-symbolic" />
              </button>
            </box>

            {/* Cover art */}
            <box class="media-cover-section" hexpand>
              <image overflow={Gtk.Overflow.HIDDEN} file={createBinding(player, "coverArt")} class="media-cover-image" />
            </box>

            {/* Media details */}
            <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.CENTER} class="media-info-section">
              <label halign={Gtk.Align.CENTER} label={createBinding(player, "title")} class="media-song-title" />
              <label halign={Gtk.Align.CENTER} label={createBinding(player, "artist")} class="media-song-artist" />
            </box>

            {/* Progress section with clickable progress bar */}
            <box orientation={Gtk.Orientation.VERTICAL} class="media-progress-section">
              <slider
                class="media-progress-scale"
                orientation={Gtk.Orientation.HORIZONTAL}
                drawValue={false}
                value={createBinding(player, "position")((pos: number) => pos || 0)}
                max={createBinding(player, "length")((len: number) => len || 100)}
                onChangeValue={({ value }: { value: number }) => {
                  if (player.set_position) {
                    player.set_position(value);
                  }
                }}
              />
              <box orientation={Gtk.Orientation.HORIZONTAL} class="media-time-section">
                <label 
                  halign={Gtk.Align.START}
                  label={createBinding(player, "position")((pos: number) => {
                    const minutes = Math.floor(pos / 60);
                    const seconds = Math.floor(pos % 60);
                    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                  })} 
                  class="media-time-current" 
                />
                <box hexpand />
                <label 
                  halign={Gtk.Align.END}
                  label={createBinding(player, "length")((len: number) => {
                    const minutes = Math.floor(len / 60);
                    const seconds = Math.floor(len % 60);
                    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                  })} 
                  class="media-time-total" 
                />
              </box>
            </box>

            {/* Control buttons */}
            <box orientation={Gtk.Orientation.HORIZONTAL} halign={Gtk.Align.CENTER} class="media-controls-section">
              {/* Previous button */}
              <button 
                onClicked={() => player.previous()} 
                class="media-btn media-btn-prev"
              >
                <image iconName="media-skip-backward-symbolic" />
              </button>

              {/* Play/Pause button */}
              <button 
                onClicked={() => player.play_pause()} 
                class="media-btn media-btn-play"
              >
                <image
                  iconName={createBinding(player, "playbackStatus")((s: any) => 
                    s === AstalMpris.PlaybackStatus.PLAYING ? "media-playback-pause-symbolic" : "media-playback-start-symbolic"
                  )}
                />
              </button>

              {/* Next button */}
              <button 
                onClicked={() => player.next()} 
                class="media-btn media-btn-next"
              >
                <image iconName="media-skip-forward-symbolic" />
              </button>
            </box>
          </box>
        )}
      </For>
    </window>
  );
}

function Mpris() {
  const mpris = AstalMpris.get_default();
  const apps = new AstalApps.Apps();
  const players = createBinding(mpris, "players");

  // Helper function to get artist and title
  function getArtistAndTitle(player: any) {
    return createBinding(player, "artist")((artist: string) => {
      const title = player.title;
      return artist ? `${artist} - ${title}` : title;
    });
  }

  // Function to toggle media player window
  function toggleMediaPlayer() {
    const window = app.get_window("media-player");
    if (window) {
      window.visible = !window.visible;
    }
  }

  return (
    <box>
      <button onClicked={toggleMediaPlayer} class="media-toggle-btn">
        <box>
          {/* Display current player's artist and title */}
          <For each={players}>
            {(player: any) => {
              const [app] = apps.exact_query(player.entry);
              // Ensure 'app' exists to prevent crashes if no matching app is found.
              return <label label={getArtistAndTitle(player)} visible={!!app} />;
            }}
          </For>
        </box>
      </button>
    </box>
  );
}

// --- WORKSPACES IMPLEMENTATION ---

const hyprland = Hyprland.get_default();

/**
 * Workspaces component for Hyprland using AstalHyprland.
 * This implementation has been rewritten to avoid the "nesting Fragments" error
 * by using a more direct reactive approach for setting the button's class.
 */
export function Workspaces() {
  // Create a binding for the list of workspaces that sorts them by ID.
  const workspaces = createBinding(hyprland, "workspaces")(ws =>
    ws.sort((a, b) => a.get_id() - b.get_id())
  );

  return (
    <box class="workspaces">
      <For each={workspaces}>
        {(workspace) => (
          <button
            // The 'key' prop is not supported on Gtk widgets and has been removed.
            // Bind the class directly to the focused workspace
            class={createBinding(hyprland, "focused_workspace")(fw =>
              `${fw.get_id() === workspace.get_id() ? "active-workspace" : "inactive-workspace"}`
            )}
            onClicked={() => workspace.focus()}
          >
            <label label={workspace.get_id().toString()} />
          </button>
        )}
      </For>
    </box>
  );
}


function Tray() {
  const tray = AstalTray.get_default()
  const items = createBinding(tray, "items")

  const init = (btn: any, item: any) => {
    btn.menuModel = item.menuModel
    btn.insert_action_group("dbusmenu", item.actionGroup)
    item.connect("notify::action-group", () => {
      btn.insert_action_group("dbusmenu", item.actionGroup)
    })
  }

  return (
    <box>
      <For each={items}>
        {(item) => (
          <menubutton $={(self) => init(self, item)}>
            <image gicon={createBinding(item, "gicon")} />
          </menubutton>
        )}
      </For>
    </box>
  )
}

function Wireless() {
  const network = AstalNetwork.get_default()
  const wifi = createBinding(network, "wifi")

  const sorted = (arr: any[]) => {
    return arr.filter((ap: any) => !!ap.ssid).sort((a: any, b: any) => b.strength - a.strength)
  }

  async function connect(ap: any) {
    try {
      await execAsync(`nmcli d wifi connect ${ap.bssid}`)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <box visible={wifi(Boolean)}>
      <With value={wifi}>
        {(wifi) =>
          wifi && (
            <menubutton>
              <image iconName={createBinding(wifi, "iconName")} />
              <popover>
                <box orientation={Gtk.Orientation.VERTICAL}>
                  <For each={createBinding(wifi, "accessPoints")(sorted)}>
                    {(ap) => (
                      <button onClicked={() => connect(ap)}>
                        <box spacing={4}>
                          <image iconName={createBinding(ap, "iconName")} />
                          <label label={createBinding(ap, "ssid")} />
                          <image
                            iconName="object-select-symbolic"
                            visible={createBinding(
                              wifi,
                              "activeAccessPoint",
                            )((active) => active === ap)}
                          />
                        </box>
                      </button>
                    )}
                  </For>
                </box>
              </popover>
            </menubutton>
          )
        }
      </With>
    </box>
  )
}

function AudioOutput() {
  const { defaultSpeaker: speaker } = AstalWp.get_default()

  return (
    <menubutton>
      <image iconName={createBinding(speaker, "volumeIcon")} />
      <popover>
        <box>
          <slider
            widthRequest={260}
            onChangeValue={({ value }) => speaker.set_volume(value)}
            value={createBinding(speaker, "volume")}
          />
        </box>
      </popover>
    </menubutton>
  )
}

function Battery() {
  const battery = AstalBattery.get_default()
  const powerprofiles = AstalPowerProfiles.get_default()

  const percent = createBinding(
    battery,
    "percentage",
  )((p) => `${Math.floor(p * 100)}%`)

  const setProfile = (profile: any) => {
    powerprofiles.set_active_profile(profile)
  }

  return (
    <menubutton visible={createBinding(battery, "isPresent")}>
      <box>
        <image iconName={createBinding(battery, "iconName")} />
        <label label={percent} />
      </box>
      <popover>
        <box orientation={Gtk.Orientation.VERTICAL}>
          {powerprofiles.get_profiles().map(({ profile }: { profile: any }) => (
            <button onClicked={() => setProfile(profile)}>
              <label label={profile} xalign={0} />
            </button>
          ))}
        </box>
      </popover>
    </menubutton>
  )
}

function Clock({ format = "%I:%M" }) {
  const time = createPoll("", 1000, () => {
    return GLib.DateTime.new_now_local().format(format)
  })

  return (
    <menubutton>
      <label label={time} />
      <popover>
        <Gtk.Calendar />
      </popover>
    </menubutton>
  )
}

export default function Bar(gdkmonitor: any) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  return (
    <>
      {/* Main Bar Window */}
      <window
        visible
        name="bar"
        gdkmonitor={gdkmonitor}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        anchor={TOP | LEFT | RIGHT}
        application={app}
      >
        <centerbox>
          <box $type="start">
            <Workspaces />
          </box>
          <box $type="center">
            <Mpris />
          </box>
          <box $type="end">
            <Tray />
            <Clock />
            <AudioOutput />
            <Battery />
            <button
              onClicked={toggleWallpaperPicker}
              tooltipText="Wallpaper Picker"
            >
              <image iconName="preferences-desktop-wallpaper-symbolic" />
            </button>
          </box>
        </centerbox>
      </window>

      {/* Media Player Window */}
      <MediaPlayerWindow />
    </>
  )
}
