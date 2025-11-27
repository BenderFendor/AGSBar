# Astal Documentation

Installation

Quick Start

First Widgets

Theming

App and CLI

Utilities

Resources

Intrinsics

FAQ

Nix

Migration Guide
On this page

    Entry point of applications
    Root of every shell component: Window
    Creating and nesting widgets
    Displaying Data
    Conditional Rendering
    Rendering lists
    Widget signal handlers
    How properties are passed
    State management
    Dynamic rendering
    Dynamic list rendering

First Widgets

On this page you will learn about the JSX syntax. To learn about it more in depth you can read the Gnim docs.

TIP

gnim is reexported from the ags module.
Entry point of applications

Every application's entry point is an app.start invocation. app is a singleton instance of Astal.Application.

import app from "ags/gtk4/app"

app.start({
  main() {
    // you will instantiate Widgets here
    // and setup anything else if you need
  },
})

Root of every shell component: Window

Desktop Shells are composed of widgets. A widget is a piece of UI that has its own logic and style. A widget can be as small as a button or an entire bar. The top level - also known as a root - widget is always a Window.

function Bar(monitor = 0) {
  return (
    <window class="Bar" monitor={monitor}>
      <box>Content of the widget</box>
    </window>
  )
}

app.start({
  main() {
    Bar(0)
    Bar(1) // instantiate for each monitor
  },
})

Creating and nesting widgets

Widgets are JavaScript functions which return GObject.Object (usually Gtk.Widget) instances by using JSX expressions.
MyButton.tsx

function MyButton() {
  return (
    <button onClicked={(self) => console.log(self, "clicked")}>
      <label label="Click me!" />
    </button>
  )
}

Now that you have declared MyButton, you can nest it into another component.

function MyBar() {
  return (
    <window>
      <box>
        Click The button
        <MyButton />
      </box>
    </window>
  )
}

Notice that widgets you defined start with a capital letter <MyButton />. Lowercase tags are builtin intrinsic widgets, while capital letter is for custom widgets.
Displaying Data

JSX lets you put markup into JavaScript. Curly braces let you “escape back” into JavaScript so that you can embed some variable from your code and display it.

function MyWidget() {
  const label = "hello"

  return <button>{label}</button>
}

You can also pass JavaScript to markup attributes

function MyWidget() {
  const label = "hello"

  return <button label={label} />
}

Conditional Rendering

You can use the same techniques as you use when writing regular JavaScript code. For example, you can use an if statement to conditionally include JSX:

function MyWidget() {
  let content

  if (condition) {
    content = <True />
  } else {
    content = <False />
  }

  return <box>{content}</box>
}

You can also inline a conditional ? (ternary) expression.

function MyWidget() {
  return <box>{condition ? <True /> : <False />}</box>
}

When you don’t need the else branch, you can also use a shorter logical && syntax:

function MyWidget() {
  return <box>{condition && <True />}</box>
}

TIP

falsy values are not rendered.
Rendering lists

You can use for loops or array map() function.

function MyWidget() {
  const labels = ["label1", "label2", "label3"]

  return (
    <box>
      {labels.map((label) => (
        <label label={label} />
      ))}
    </box>
  )
}

Widget signal handlers

You can respond to events by declaring event handler functions inside your widget:

import Gtk from "gi://Gtk"

function MyButton() {
  function onClicked(self: Gtk.Button) {
    console.log(self, "was clicked")
  }

  return <button onClicked={onClicked} />
}

How properties are passed

Using JSX, a custom widget will always have a single object as its parameter.

type Props = {
  myprop: string
  children?: JSX.Element | Array<JSX.Element>
}

function MyWidget({ myprop, children }: Props) {
  //
}

TIP

JSX.Element is an alias to GObject.Object

The children property is a special one which is used to pass the children given in the JSX expression.

// `children` prop of MyWidget is the box
return (
  <MyWidget myprop="hello">
    <box />
  </MyWidget>
)

// `children` prop of MyWidget is [box, box]
return (
  <MyWidget myprop="hello">
    <box />
    <box />
  </MyWidget>
)

State management

State is managed using signals. The most common signal you will use is createState and createBinding. createState is a writable signal while createBinding will be used to hook into GObject properties.
State example
GObject example

import { createState } from "ags"

function Counter() {
  const [count, setCount] = createState(0)

  function increment() {
    setCount((v) => v + 1)
  }

  const label = count((num) => num.toString())

  return (
    <box>
      <label label={label} />
      <button onClicked={increment}>Click to increment</button>
    </box>
  )
}

Signals can be called as a function which lets you transform its value. In the case of a Gtk.Label in this example, its label property expects a string, so it needs to be turned to a string first.
Dynamic rendering

When you want to render based on a value, you can use the <With> component.

import { With, Accessor } from "ags"

let value: Accessor<{ member: string } | null>

return (
  <box>
    <With value={value}>
      {(value) => value && <label label={value.member} />}
    </With>
  </box>
)

TIP

In a lot of cases it is better to always render the component and set its visible property instead

WARNING

When the value changes and the widget is re-rendered the previous one is removed from the parent component and the new one is appended. Order of widgets are not kept so make sure to wrap <With> in a container to avoid it. This is due to Gtk not having a generic API on containers to sort widgets.
Dynamic list rendering

The <For> component let's you render based on an array dynamically. Each time the array changes it is compared with its previous state. Widgets for new items are inserted while widgets associated with removed items are removed.

import { For, Accessor } from "ags"

let list: Accessor<Array<any>>

return (
  <box>
    <For each={list}>
      {(item, index: Binding<number>) => (
        <label label={index.as((i) => `${i}. ${item}`)} />
      )}
    </For>
  </box>
)

WARNING

Similarly to <With>, when the list changes and a new item is added it is simply appended to the parent. Order of widgets are not kept so make sure to wrap <For> in a container to avoid this.
Edit this page on GitHub

Last updated: 7/2/25, 1:08 PM
Pager
Previous pageQuick Start
Next pageTheming


Skip to content
AGS
Main Navigation
Guide
Sidebar Navigation

Installation

Quick Start

First Widgets

Theming

App and CLI

Utilities

Resources

Intrinsics

FAQ

Nix

Migration Guide
On this page

    Loading static stylesheets
    Css Property on Widgets
    Apply Stylesheets at Runtime
    Inspector

Theming

Since the widget toolkit is GTK theming is done with CSS.

    CSS tutorial
    Gtk4
        GTK4 CSS Overview wiki
        GTK4 CSS Properties Overview wiki
    Gtk3
        GTK3 CSS Overview wiki
        GTK3 CSS Properties Overview wiki

GTK is not the web

While most features are implemented in GTK, you can't assume anything that works on the web will work with GTK. Refer to the GTK docs to see what is supported.
Loading static stylesheets

You can import any css or scss file which will be inlined as a string which you can pass to the css property.
app.ts

import css from "./style.css"
import scss from "./style.scss"

const inlineCss = `
  window {
    background-color: transparent;
  }
`

app.start({
  css: css,
  css: scss,
  css: inlineCss,
})

Css Property on Widgets

You should always prefer to style using class names and stylesheets. But in those rare cases when you need apply a style based on a JavaScript value you can use the css property.

<box css="padding 1em; border: 1px solid red;" />

WARNING

The css property of a widget will not cascade to its children. You should generally avoid using css and instead use class and stylesheets.
Apply Stylesheets at Runtime

You can apply additional styles at runtime.

app.apply_css("/path/to/file.css")

app.apply_css(`
  window {
    background-color: transparent;
  }
`)

app.reset_css() // reset if need

WARNING

apply_css() will apply on top of other stylesheets applied before. You can reset stylesheets with reset_css()
Inspector

If you are not sure about the widget hierarchy or any CSS selector, you can use the GTK inspector
ags
astal

ags inspect

Edit this page on GitHub

Last updated: 6/26/25, 6:15 PM
Pager
Previous pageFirst Widgets
Next pageApp and CLI


Skip to content
AGS
Main Navigation
Guide
Sidebar Navigation

Installation

Quick Start

First Widgets

Theming

App and CLI

Utilities

Resources

Intrinsics

FAQ

Nix

Migration Guide
On this page

    Entry point
    Instance identifier
    Messaging from CLI
    Toggling Windows by their name
    Client

App and CLI

app is a singleton instance of an Astal.Application.

Depending on Gtk version import paths will differ

import app from "astal/gtk3/app"
import app from "astal/gtk4/app"

TIP

Astal.Application's DBus name is prefixed with io.Astal. If you are writing a shell which is meant to be distributed you might want to avoid using app and instead create a subclass of Gtk.Application or Adw.Application while also following the packaging conventions

Entry point
app.ts

app.start({
  main() {
    // setup anything
    // instantiate widgets
  },
})

Instance identifier

You can run multiple instances by defining a unique instance name.

app.start({
  instanceName: "my-instance", // defaults to "astal"
  main() {},
})

Messaging from CLI

If you want to interact with an instance from the CLI, you can do so by sending a message.

app.start({
  requestHandler(request: string, res: (response: any) => void) {
    if (request == "say hi") {
      return res("hi cli")
    }
    res("unknown command")
  },
  main() {},
})

ags cli
astal cli

ags request "say hi"
# hi cli

If you want to run arbitrary JavaScript from CLI, you can use the eval() method which will evaluate the passed string as the body of an async function.

app.start({
  main() {},
  requestHandler(js, res) {
    app.eval(js).then(res).catch(res)
  },
})

If the string does not contain a semicolon, a single expression is assumed and returned implicitly.

astal "'hello'"
# hello

If the string contains a semicolon, you have to return explicitly.

astal "'hello';"
# undefined

astal "return 'hello';"
# hello

Toggling Windows by their name

In order for the application to know about your windows, you have to register them. You can do this by specifying a unique name and calling app.add_window()

import app from "astal/gtk4/app"

function Bar() {
  return (
    <window name="Bar" $={(self) => app.add_window(self)}>
      <box />
    </window>
  )
}

You can also invoke app.add_window() by simply passing app to the application prop.

import app from "astal/gtk4/app"

function Bar() {
  return (
    <window name="Bar" application={app}>
      <box />
    </window>
  )
}

WARNING

When assigning the application prop make sure name comes before. Props are set sequentially and if name is applied after application it won't work.

astal -t Bar

TIP

In JavaScript you can get a window instance and toggle it using app.get_window()

const bar = app.get_window("Bar")
if (bar) bar.visible = true

Client

The first time you invoke app.start() the main block gets executed. While that instance is running any subsequent execution of the app will execute the client block.
main.ts

app.start({
  // main instance
  main(...args: Array<string>) {
    print(...args)
  },

  // every subsequent calls
  client(message: (msg: string) => string, ...args: Array<string>) {
    const res = message("you can message the main instance")
    print(res)
  },

  // this runs in the main instance
  requestHandler(request: string, res: (response: any) => void) {
    res("response from main")
  },
})

Edit this page on GitHub

Last updated: 6/23/25, 3:55 PM
Pager
Previous pageTheming
Next pageUtilities


AstalMpris

API Version: 0.1

Library Version: 0.1.0
Type
Player
Constructors
new
Instance methods
raise
quit
toggle_fullscreen
next
previous
pause
play_pause
stop
play
open_uri
loop
shuffle
get_meta
get_bus_name
get_available
get_can_quit
get_fullscreen
get_can_set_fullscreen
get_can_raise
get_identity
get_entry
get_supported_uri_schemes
get_supported_mime_types
get_loop_status
set_loop_status
get_rate
set_rate
get_shuffle_status
set_shuffle_status
get_volume
set_volume
get_position
set_position
get_playback_status
get_minimum_rate
get_maximum_rate
get_can_go_next
get_can_go_previous
get_can_play
get_can_pause
get_can_seek
get_can_control
get_metadata
get_trackid
get_length
get_art_url
get_album
get_album_artist
get_artist
get_lyrics
get_title
get_composer
get_comments
get_cover_art
Properties
bus-name
available
can-quit
fullscreen
can-set-fullscreen
can-raise
identity
entry
supported-uri-schemes
supported-mime-types
loop-status
rate
shuffle-status
volume
position
playback-status
minimum-rate
maximum-rate
can-go-next
can-go-previous
can-play
can-pause
can-seek
can-control
metadata
trackid
length
art-url
album
album-artist
artist
lyrics
title
composer
comments
cover-art

Generated by
gi-docgen
2024.1
Class
AstalMprisPlayer

[−]
Description

class AstalMpris.Player : GObject.Object
{
  /* No available fields */
}

Object which tracks players through their mpris dbus interface. The most simple way is to use AstalMprisMpris which tracks every player, but AstalMprisPlayer can be constructed for a dedicated players too.
[−]
Ancestors

    GObject

[−]
Constructors
astal_mpris_player_new

Construct a Player that tracks a dbus name. For example “org.mpris.MediaPlayer2.spotify”. The “org.mpris.MediaPlayer2.” prefix can be leftout so simply “spotify” would mean the same. AstalMprisPlayer:available indicates whether the player is actually running or not.

[−]
Instance methods
astal_mpris_player_raise

Brings the player’s user interface to the front using any appropriate mechanism available. The media player may be unable to control how its user interface is displayed, or it may not have a graphical user interface at all. In this case, the AstalMprisPlayer:can-raise is false and this method does nothing.

astal_mpris_player_quit

Causes the media player to stop running. The media player may refuse to allow clients to shut it down. In this case, the AstalMprisPlayer:can-quit property is false and this method does nothing.

astal_mpris_player_toggle_fullscreen

Toggle AstalMprisPlayer:fullscreen state.

astal_mpris_player_next

Skips to the next track in the tracklist. If there is no next track (and endless playback and track repeat are both off), stop playback. If AstalMprisPlayer:can-go-next is false this method has no effect.

astal_mpris_player_previous

Skips to the previous track in the tracklist. If there is no previous track (and endless playback and track repeat are both off), stop playback. If AstalMprisPlayer:can-go-previous is false this method has no effect.

astal_mpris_player_pause

Pauses playback. If playback is already paused, this has no effect. If AstalMprisPlayer:can-pause is false this method has no effect.

astal_mpris_player_play_pause

Pauses playback. If playback is already paused, resumes playback. If playback is stopped, starts playback.

astal_mpris_player_stop

Stops playback. If playback is already stopped, this has no effect. If AstalMprisPlayer:can-control is false this method has no effect.

astal_mpris_player_play

Starts or resumes playback. If already playing, this has no effect. If paused, playback resumes from the current position. If [property@ AstalMpris.Player:can_play] is false this method has no effect.

astal_mpris_player_open_uri

Uri scheme should be an element of AstalMprisPlayer:supported-uri-schemes and the mime-type should match one of the elements of AstalMprisPlayer:supported-mime-types.

astal_mpris_player_loop

Change AstalMprisPlayer:loop-status from none to track, from track to playlist, from playlist to none.

astal_mpris_player_shuffle

Toggle AstalMprisPlayer:shuffle-status.

astal_mpris_player_get_meta

Lookup a key from AstalMprisPlayer:metadata. This method is useful for languages that fail to introspect hashtables.

astal_mpris_player_get_bus_name
No description available.

astal_mpris_player_get_available
No description available.

astal_mpris_player_get_can_quit
No description available.

astal_mpris_player_get_fullscreen
No description available.

astal_mpris_player_get_can_set_fullscreen
No description available.

astal_mpris_player_get_can_raise
No description available.

astal_mpris_player_get_identity
No description available.

astal_mpris_player_get_entry
No description available.

astal_mpris_player_get_supported_uri_schemes
No description available.

astal_mpris_player_get_supported_mime_types
No description available.

astal_mpris_player_get_loop_status
No description available.

astal_mpris_player_set_loop_status
No description available.

astal_mpris_player_get_rate
No description available.

astal_mpris_player_set_rate
No description available.

astal_mpris_player_get_shuffle_status
No description available.

astal_mpris_player_set_shuffle_status
No description available.

astal_mpris_player_get_volume
No description available.

astal_mpris_player_set_volume
No description available.

astal_mpris_player_get_position
No description available.

astal_mpris_player_set_position
No description available.

astal_mpris_player_get_playback_status
No description available.

astal_mpris_player_get_minimum_rate
No description available.

astal_mpris_player_get_maximum_rate
No description available.

astal_mpris_player_get_can_go_next
No description available.

astal_mpris_player_get_can_go_previous
No description available.

astal_mpris_player_get_can_play
No description available.

astal_mpris_player_get_can_pause
No description available.

astal_mpris_player_get_can_seek
No description available.

astal_mpris_player_get_can_control
No description available.

astal_mpris_player_get_metadata
No description available.

astal_mpris_player_get_trackid
No description available.

astal_mpris_player_get_length
No description available.

astal_mpris_player_get_art_url
No description available.

astal_mpris_player_get_album
No description available.

astal_mpris_player_get_album_artist
No description available.

astal_mpris_player_get_artist
No description available.

astal_mpris_player_get_lyrics
No description available.

astal_mpris_player_get_title
No description available.

astal_mpris_player_get_composer
No description available.

astal_mpris_player_get_comments
No description available.

astal_mpris_player_get_cover_art
No description available.

[+]
Methods inherited from GObject (43)
[−]
Properties
AstalMpris.Player:bus-name

Full dbus namae of this player.

AstalMpris.Player:available

Indicates if AstalMprisPlayer:bus-name is available on dbus.

AstalMpris.Player:can-quit

Indicates if astal_mpris_player_quit() has any effect.

AstalMpris.Player:fullscreen

Indicates if the player is occupying the fullscreen. This is typically used for videos. Use astal_mpris_player_toggle_fullscreen() to toggle fullscreen state.

AstalMpris.Player:can-set-fullscreen

Indicates if astal_mpris_player_toggle_fullscreen() has any effect.

AstalMpris.Player:can-raise

Indicates if astal_mpris_player_raise() has any effect.

AstalMpris.Player:identity

A human friendly name to identify the player.

AstalMpris.Player:entry

The base name of a .desktop file.

AstalMpris.Player:supported-uri-schemes

The URI schemes supported by the media player. This can be viewed as protocols supported by the player in almost all cases. Almost every media player will include support for the “file ” scheme. Other common schemes are “http” and “rtsp”.

AstalMpris.Player:supported-mime-types

The mime-types supported by the player.

AstalMpris.Player:loop-status

The current loop/repeat status.

AstalMpris.Player:rate

The current playback rate.

AstalMpris.Player:shuffle-status

The current shuffle status.

AstalMpris.Player:volume

The current volume level between 0 and 1.

AstalMpris.Player:position

The current position of the track in seconds. To get a progress percentage simply divide this with AstalMprisPlayer:length.

AstalMpris.Player:playback-status

The current playback status.

AstalMpris.Player:minimum-rate

The minimum value which the AstalMprisPlayer:rate can take.

AstalMpris.Player:maximum-rate

The maximum value which the AstalMprisPlayer:rate can take.

AstalMpris.Player:can-go-next

Indicates if invoking astal_mpris_player_next() has effect.

AstalMpris.Player:can-go-previous

Indicates if invoking astal_mpris_player_previous() has effect.

AstalMpris.Player:can-play

Indicates if invoking astal_mpris_player_play() has effect.

AstalMpris.Player:can-pause

Indicates if invoking astal_mpris_player_pause() has effect.

AstalMpris.Player:can-seek

Indicates if setting AstalMprisPlayer:position has effect.

AstalMpris.Player:can-control

Indicates if the player can be controlled with methods such as astal_mpris_player_play_pause().

AstalMpris.Player:metadata

Metadata hashtable of this player. In languages that cannot introspect this use astal_mpris_player_get_meta().

AstalMpris.Player:trackid

Currently playing track’s id.

AstalMpris.Player:length

Length of the currently playing track in seconds.

AstalMpris.Player:art-url

The location of an image representing the track or album. You should always prefer to use AstalMprisPlayer:cover-art.

AstalMpris.Player:album

Title of the currently playing album.

AstalMpris.Player:album-artist

Artists of the currently playing album.

AstalMpris.Player:artist

Artists of the currently playing track.

AstalMpris.Player:lyrics

Lyrics of the currently playing track.

AstalMpris.Player:title

Title of the currently playing track.

AstalMpris.Player:composer

Composers of the currently playing track.

AstalMpris.Player:comments

Comments of the currently playing track.

AstalMpris.Player:cover-art

Path of the cached AstalMprisPlayer:art-url.

[−]
Signals
[+]
Signals inherited from GObject (1)
[+]
Class structure

Content

    Description
    Ancestors
    Constructors
    Methods
    Properties

AstalMpris

API Version: 0.1

Library Version: 0.1.0
Type
Mpris
Constructors
new
Functions
get_default
Instance methods
get_players
Properties
players
Signals
player-added
player-closed

Generated by
gi-docgen
2024.1
Class
AstalMprisMpris

[−]
Description

class AstalMpris.Mpris : GObject.Object
{
  /* No available fields */
}

Object that monitors dbus for players to appear and disappear.
[−]
Ancestors

    GObject

[−]
Constructors
astal_mpris_mpris_new
No description available.

[−]
Functions
astal_mpris_mpris_get_default

Gets the default singleton Mpris instance.

[−]
Instance methods
astal_mpris_mpris_get_players
No description available.

[+]
Methods inherited from GObject (43)
[−]
Properties
AstalMpris.Mpris:players

List of currently available players.

[−]
Signals
AstalMpris.Mpris::player-added

Emitted when a new mpris Player appears.

AstalMpris.Mpris::player-closed

Emitted when a Player disappears.

[−]
Signals inherited from GObject (1)
GObject::notify

The notify signal is emitted on an object when one of its properties has its value set through g_object_set_property(), g_object_set(), et al.
[−]
Class structure

struct AstalMprisMprisClass {
  /* no available fields */
}

No description available.

Content

    Description
    Ancestors
    Constructors
    Functions
    Methods
    Properties
    Signals




Skip to content
Gnim
Sidebar Navigation
Tutorial

Intro

GObject

Gtk

Gnim

App

Packaging
Reference

JSX

GObject

DBus

Polyfills
On this page

    JSX expressions and jsx function
    JSX Element
    Class components
        Constructor function
        Type string
        Signal handlers
        Setup function
        Bindings
        How children are passed to class components
        Class names and inline CSS
        This component
    Function components
        Setup function
        How children are passed to function components
        Everything has to be handled explicitly in function components
    Control flow
        Dynamic rendering
        List rendering
        Fragments
    State management
        createState
        createComputed
        createBinding
        createConnection
        createSettings
        createExternal
    Scopes and Life cycle
        createRoot
        getScope
        onCleanup
        onMount
        Contexts
    Intrinsic Elements

JSX

Syntactic sugar for creating objects declaratively.

This is not React

This works nothing like React and has nothing in common with React other than the XML syntax.

Consider the following example:

function Box() {
  let counter = 0

  const button = new Gtk.Button()
  const icon = new Gtk.Image({
    iconName: "system-search-symbolic",
  })
  const label = new Gtk.Label({
    label: `clicked ${counter} times`,
  })
  const box = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
  })

  function onClicked() {
    label.label = `clicked ${counter} times`
  }

  button.set_child(icon)
  box.append(button)
  box.append(label)
  button.connect("clicked", onClicked)
  return box
}

Can be written as

function Box() {
  const [counter, setCounter] = createState(0)
  const label = createComputed([counter], (c) => `clicked ${c} times`)

  function onClicked() {
    setCounter((c) => c + 1)
  }

  return (
    <Gtk.Box orientation={Gtk.Orientation.VERTICAL}>
      <Gtk.Button onClicked={onClicked}>
        <Gtk.Image iconName="system-search-symbolic" />
      </Gtk.Button>
      <Gtk.Label label={label} />
    </Gtk.Box>
  )
}

JSX expressions and jsx function

A JSX expression transpiles to a jsx function call. A JSX expression's type however is always the base GObject.Object type, while the jsx return type is the instance type of the class or the return type of the function you pass to it. If you need the actual type of an object, either use the jsx function directly or type assert the JSX expression.

import { jsx } from "gnim"

const menubutton = new Gtk.MenuButton()

menubutton.popover = <Gtk.Popover /> // cannot assign Object to Popover
menubutton.popover = jsx(Gtk.Popover, {}) // works as expected

function MyPopover(): Gtk.Popover
menubutton.popover = <MyPopover /> // cannot assign Object to Popover
menubutton.popover = jsx(MyPopover, {}) // works as expected

JSX Element

A valid JSX component must either be a function that returns a GObject.Object instance, or a class that inherits from GObject.Object.

TIP

JSX.Element is simply an alias for GObject.Object.

When two types have a parent-child relationship, they can be composed naturally using JSX syntax. For example, this applies to types like Gtk.EventController:

<Gtk.Box>
  <Gtk.GestureClick onPressed={() => print("clicked")} />
</Gtk.Box>

Class components

When defining custom components, choosing between using classes vs. functions is mostly down to preference. There are cases when one or the other is more convenient to use, but you will mostly be using class components from libraries such as Gtk, and defining function components for custom components.

Using classes in JSX expressions lets you set some additional properties.
Constructor function

By default, classes are instantiated with the new keyword and initial values are passed in. In cases where you need to use a static constructor function instead, you can specify it with $constructor.

WARNING

Initial values this way cannot be passed to the constructor and are set after construction. This means construct-only properties like css-name cannot be set.

<Gtk.DropDown
  $constructor={() => Gtk.DropDown.new_from_strings(["item1", "item2"])}
/>

Type string

Under the hood, the jsx function uses the Gtk.Buildable interface, which lets you use a type string to specify the type the child is meant to be.

In Gnome extensions, it has no effect.

<Gtk.CenterBox>
  <Gtk.Box $type="start" />
  <Gtk.Box $type="center" />
  <Gtk.Box $type="end" />
</Gtk.CenterBox>

Signal handlers

Signal handlers can be defined with an on prefix, and notify:: signal handlers can be defined with an onNotify prefix.

<Gtk.Revealer
  onNotifyChildRevealed={(self) => print(self, "child-revealed")}
  onDestroy={(self) => print(self, "destroyed")}
/>

Setup function

It is possible to define an arbitrary function to do something with the instance imperatively. It is run after properties are set, signals are connected, and children are appended, but before the jsx function returns.

<Gtk.Stack $={(self) => print(self, "is about to be returned")} />

The most common use case is to acquire a reference to the widget in the scope of the function.

function MyWidget() {
  let box: Gtk.Box

  function someHandler() {
    console.log(box)
  }

  return <Gtk.Box $={(self) => (box = self)} />
}

Another common use case is to initialize relations between widgets in the tree.

function MyWidget() {
  let searchbar: Gtk.SearchBar

  function init(win: Gtk.Window) {
    searchbar.set_key_capture_widget(win)
  }

  return (
    <Gtk.Window $={init}>
      <Gtk.SearchBar $={(self) => (searchbar = self)}>
        <Gtk.SearchEntry />
      </Gtk.SearchBar>
    </Gtk.Window>
  )
}

Bindings

Properties can be set as a static value. Alternatively, they can be passed an Accessor, in which case whenever its value changes, it will be reflected on the widget.

const [revealed, setRevealed] = createState(false)

return (
  <Gtk.Button onClicked={() => setRevealed((v) => !v)}>
    <Gtk.Revealer revealChild={revealed}>
      <Gtk.Label label="content" />
    </Gtk.Revealer>
  </Gtk.Button>
)

How children are passed to class components

Class components can only take GObject.Object instances as children. They are set through Gtk.Buildable.add_child.

NOTE

In Gnome extensions, they are set with Clutter.Actor.add_child.

@register({ Implements: [Gtk.Buildable] })
class MyContainer extends Gtk.Widget {
  vfunc_add_child(
    builder: Gtk.Builder,
    child: GObject.Object,
    type?: string | null,
  ): void {
    if (child instanceof Gtk.Widget) {
      // set children here
    } else {
      super.vfunc_add_child(builder, child, type)
    }
  }
}

Class names and inline CSS

JSX supports setting class and css properties. css is mostly meant to be used as a debugging tool, e.g. with css="border: 1px solid red;". class is a space-separated list of class names.

<Gtk.Button class="flat" css="border: 1px solid red;" />

NOTE

Besides class, you can also use css-classes in Gtk4 and style-class in Gnome.
This component

In most cases, you will use JSX to instantiate objects. However, there are cases when you have a reference to an instance that you would like to use in a JSX expression, for example, in subclasses.

@register()
class Row extends Gtk.ListBoxRow {
  constructor(props: Partial<Gtk.ListBoxRow.ConstructorProps>) {
    super(props)

    void (
      <This this={this as Row} onActivate={() => print("activated")}>
        <Gtk.Label label="content" />
      </This>
    )
  }
}

Function components
Setup function

Just like class components, function components can also have a setup function.

import { FCProps } from "gnim"

type MyComponentProps = FCProps<
  Gtk.Button,
  {
    prop?: string
  }
>

function MyComponent({ prop }: MyComponentProps) {
  return <Gtk.Button label={prop} />
}

return <MyComponent $={(self) => print(self, "is a Button")} prop="hello" />

NOTE

FCProps is required for TypeScript to be aware of the $ prop.
How children are passed to function components

They are passed in through the children property. They can be of any type.

interface MyButtonProps {
  children: string
}

function MyButton({ children }: MyButtonProps) {
  return <Gtk.Button label={children} />
}

return <MyButton>Click Me</MyButton>

When multiple children are passed in, children is an Array.

interface MyBoxProps {
  children: Array<GObject.Object | string>
}

function MyBox({ children }: MyBoxProps) {
  return (
    <Gtk.Box>
      {children.map((item) =>
        item instanceof Gtk.Widget ? (
          item
        ) : (
          <Gtk.Label label={item.toString()} />
        ),
      )}
    </Gtk.Box>
  )
}

return (
  <MyBox>
    Some Content
    <Gtk.Button />
  </MyBox>
)

Everything has to be handled explicitly in function components

There is no builtin way to define signal handlers or bindings automatically. With function components, they have to be explicitly declared and handled.

interface MyWidgetProps {
  label: Accessor<string> | string
  onClicked: (self: Gtk.Button) => void
}

function MyWidget({ label, onClicked }: MyWidgetProps) {
  return <Gtk.Button onClicked={onClicked} label={label} />
}

Control flow
Dynamic rendering

When you want to render based on a value, you can use the <With> component.

let value: Accessor<{ member: string } | null>

return (
  <With value={value}>
    {(value) => value && <Gtk.Label label={value.member} />}
  </With>
)

TIP

In a lot of cases, it is better to always render the component and set its visible property instead. This is because <With> will destroy/recreate the widget each time the passed value changes.

WARNING

When the value changes and the widget is re-rendered, the previous one is removed from the parent component and the new one is appended. The order of widgets is not kept, so make sure to wrap <With> in a container to avoid this.
List rendering

The <For> component lets you render based on an array dynamically. Each time the array changes, it is compared with its previous state. Widgets for new items are inserted, while widgets associated with removed items are removed.

let list: Accessor<Iterable<any>>

return (
  <For each={list}>
    {(item, index: Accessor<number>) => (
      <Gtk.Label label={index((i) => `${i}. ${item}`)} />
    )}
  </For>
)

WARNING

Similarly to <With>, when the list changes and a new item is added, it is simply appended to the parent. The order of widgets is not kept, so make sure to wrap <For> in a container to avoid this.
Fragments

Both <When> and <For> are Fragments. A Fragment is a collection of children. Whenever the children array changes, it is reflected on the parent widget the Fragment was assigned to. When implementing custom widgets, you need to take into consideration the API being used for child insertion and removing.

    Both Gtk3 and Gtk4 uses the Gtk.Buildable interface to append children.
    Gtk3 uses the Gtk.Container interface to remove children.
    Gtk4 checks for a method called remove.
    Clutter uses Clutter.Actor.add_child and Clutter.Actor.remove_child.

State management

There is a single primitive called Accessor, which is a read-only signal.

export interface Accessor<T> {
  get(): T
  subscribe(callback: () => void): () => void
  <R = T>(transform: (value: T) => R): Accessor<R>
}

let accessor: Accessor<any>

const unsubscribe = accessor.subscribe(() => {
  console.log("value of accessor changed to", accessor.get())
})

unsubscribe()

createState

Creates a writable signal.

function createState<T>(init: T): [Accessor<T>, Setter<T>]

Example:

const [value, setValue] = createState(0)

// setting its value
setValue(2)
setValue((prev) => prev + 1)

createComputed

Creates a computed signal from a list of Accessors. The provided transform is run when the Accessor's value is accessed. The function should be pure.

function createComputed<
  Deps extends Array<Accessor<any>>,
  Values extends { [K in keyof Deps]: Accessed<Deps[K]> },
>(deps: Deps, transform: (...values: Values) => V): Accessor<V>

Example:

let a: Accessor<string>
let b: Accessor<string>

const c = createComputed([a, b], (a, b) => `${a}+${b}`)

TIP

There is a shorthand for single dependency computed signals.

let a: Accessor<string>
const b: Accessor<string> = a((v) => `transformed ${v}`)

createBinding

Creates an Accessor on a GObject.Object's property or a Gio.Settings's key.

function createBinding<T extends GObject.Object, P extends keyof T>(
  object: T,
  property: Extract<P, string>,
): Accessor<T[P]>

function createBinding<T>(settings: Gio.Settings, key: string): Accessor<T>

Example:

const styleManager = Adw.StyleManager.get_default()
const style = createBinding(styleManager, "colorScheme")

createConnection

function createConnection<
  T,
  O extends GObject.Object,
  S extends keyof O1["$signals"],
>(
  init: T,
  handler: [
    object: O,
    signal: S,
    callback: (
      ...args: [...Parameters<O["$signals"][S]>, currentValue: T]
    ) => T,
  ],
): Accessor<T>

Creates an Accessor which sets up a list of GObject.Object signal connections. It expects an initial value and a list of [object, signal, callback] tuples where the callback is called with the arguments passed by the signal and the current value as the last parameter.

Example:

const value = createConnection(
  "initial value",
  [obj1, "notify", (pspec, currentValue) => currentValue + pspec.name],
  [obj2, "sig-name", (sigArg1, sigArg2, currentValue) => "str"],
)

IMPORTANT

The connection will only get attached when the first subscriber appears, and is dropped when the last one disappears.
createSettings

Wraps a Gio.Settings into a collection of setters and accessors.

function createSettings<const T extends Record<string, string>>(
  settings: Gio.Settings,
  keys: T,
): Settings<T>

Example:

const s = createSettings(settings, {
  "complex-key": "a{sa{ss}}",
  "simple-key": "s",
})

s.complexKey.subscribe(() => {
  print(s.complexKey.get())
})

s.setComplexKey((prev) => ({
  ...prev,
  neyKey: { nested: "" },
}))

createExternal

Creates a signal from a provider function. The provider is called when the first subscriber appears. The returned dispose function from the provider will be called when the number of subscribers drops to zero.

function createExternal<T>(
  init: T,
  producer: (set: Setter<T>) => DisposeFunction,
): Accessor<T>

Example:

const counter = createExternal(0, (set) => {
  const interval = setInterval(() => set((v) => v + 1))
  return () => clearInterval(interval)
})

Scopes and Life cycle

A scope is essentially a global object which holds cleanup functions and context values.

let scope = new Scope()

// Inside this function, synchronously executed code will have access
// to `scope` and will attach any allocated resource, such as signal
// subscriptions, to the `scope`.
scopedFuntion()

// At a later point it can be disposed.
scope.dispose()

createRoot

function createRoot<T>(fn: (dispose: () => void) => T)

Creates a root scope. Other than wrapping the main entry function in this, you likely won't need this elsewhere. <For> and <With> components run their children in their own scopes, for example.

Example:

createRoot((dipose) => {
  return <Gtk.Window onCloseRequest={dispose}></Gtk.Window>
})

getScope

Gets the current scope. You might need to reference the scope in cases where async functions need to run in the scope.

Example:

const scope = getScope()
setTimeout(() => {
  // This callback gets run without an owner scope.
  // Restore owner via scope.run:
  scope.run(() => {
    const foo = FooContext.use()
    onCleanup(() => {
      print("some cleanup")
    })
  })
}, 1000)

onCleanup

Attaches a cleanup function to the current scope.

Example:

function MyComponent() {
  const dispose = signal.subscribe(() => {})

  onCleanup(() => {
    dispose()
  })

  return <></>
}

onMount

Attaches a function to run when the farthest non-mounted scope returns.

Example:

function MyComponent() {
  onMount(() => {
    console.log("root scope returned")
  })

  return <></>
}

Contexts

Context provides a form of dependency injection. It lets you avoid the need to pass data as props through intermediate components (a.k.a. prop drilling). The default value is used when no Provider is found above in the hierarchy.

Example:

const MyContext = createContext("fallback-value")

function ConsumerComponent() {
  const value = MyContext.use()

  return <Gtk.Label label={value} />
}

function ProviderComponent() {
  return (
    <Gtk.Box>
      <MyContext value="my-value">{() => <ConsumerComponent />}</MyContext>
    </Gtk.Box>
  )
}

Intrinsic Elements

Intrinsic elements are globally available components, which in web frameworks are usually HTMLElements such as <div> <span> <p>. There are no intrinsic elements by default, but they can be set.

TIP

It should always be preferred to use function/class components directly.

    Function components

import { FCProps } from "gnim"
import { intrinsicElements } from "gnim/gtk4/jsx-runtime"

type MyLabelProps = FCProps<
  Gtk.Label,
  {
    someProp: string
  }
>

function MyLabel({ someProp }: MyLabelProps) {
  return <Gtk.Label label={someProp} />
}

intrinsicElements["my-label"] = MyLabel

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "my-label": MyLabelProps
    }
  }
}

return <my-label someProp="hello" />

Class components

    import { CCProps } from "gnim"
    import { intrinsicElements } from "gnim/gtk4/jsx-runtime"
    import { property, register } from "gnim/gobject"

    interface MyWidgetProps extends Gtk.Widget.ConstructorProps {
      someProp: string
    }

    @register()
    class MyWidget extends Gtk.Widget {
      @property(String) someProp = ""

      constructor(props: Partial<MyWidgetProps>) {
        super(props)
      }
    }

    intrinsicElements["my-widget"] = MyWidget

    declare global {
      namespace JSX {
        interface IntrinsicElements {
          "my-widget": CCProps<MyWidget, MyWidgetProps>
        }
      }
    }

    return <my-widget someProp="hello" />

Edit this page on GitHub

Last updated: 7/17/25, 9:46 PM
Pager
Previous pagePackaging
Next pageGObject

# Gtk

This page is merely an intro to Gtk and not a comprehensive guide. For more
in-depth concepts you can read the [Gtk docs](https://docs.gtk.org/gtk4/#extra).

## Running Gtk

To run Gtk you will have to initialize it, create widgets and run a GLib main
loop.

```ts
import GLib from "gi://GLib"
import Gtk from "gi://Gtk?version=4.0"

Gtk.init()

const loop = GLib.MainLoop.new(null, false)

// create widgets here

loop.runAsync()
```

## Your first widget

For a list of available widgets you can refer to the
[Gtk docs](https://docs.gtk.org/gtk4/visual_index.html). If you are planning to
write an app for the Gnome platform you might be interested in using
[Adwaita](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/).

The top level widget that makes it possible to display something on the screen
is `Gtk.Window` and its various subclasses such as `Gtk.ApplicationWindow` and
`Adw.Window`.

```ts
const win = new Gtk.Window({
  defaultWidth: 300,
  defaultHeight: 200,
  title: "My App",
})

const titlebar = new Gtk.HeaderBar()

const label = new Gtk.Label({
  label: "Hello World",
})

win.set_titlebar(titlebar)
win.set_child(label)

win.connect("close-request", () => loop.quit())

win.present()
```

## Layout system

Gtk uses [LayoutManagers](https://docs.gtk.org/gtk4/class.LayoutManager.html) to
decide how a widget positions its children. You will only directly interact with
layout managers when implementing a custom widget. Gtk provides widgets that
implement some common layouts:

- [`Box`](https://docs.gtk.org/gtk4/class.Box.html) which positions its children
  in a horizontal/vertical row.

  ```ts
  const box = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
  })

  box.append(Gtk.Label.new("1"))
  box.append(Gtk.Label.new("2"))
  ```

- [`CenterBox`](https://docs.gtk.org/gtk4/class.CenterBox.html) which positions
  its children in three separate sections similar to `Box`

  ```ts
  const centerBox = new Gtk.CenterBox({
    orientation: Gtk.Orientation.HORIZONTAL,
  })

  centerBox.set_start_widget(Gtk.Label.new("start"))
  centerBox.set_center_widget(Gtk.Label.new("center"))
  centerBox.set_end_widget(Gtk.Label.new("end"))
  ```

- [`Overlay`](https://docs.gtk.org/gtk4/class.Overlay.html) which has a single
  child that dictates the size of the widget and positions each children on top.

  ```ts
  const overlay = new Gtk.Overlay()

  overlay.set_child(Gtk.Label.new("main child"))
  overlay.add_overlay(Gtk.Label.new("overlay"))
  ```

- [`Grid`](https://docs.gtk.org/gtk4/class.Grid.html) which positions its
  children in a table layout.

  ```ts
  const grid = new Gtk.Grid()

  grid.attach(Gtk.Label.new("0x0"), 0, 0, 1, 1)
  grid.attach(Gtk.Label.new("0x1"), 0, 1, 1, 1)
  ```

- [`Stack`](https://docs.gtk.org/gtk4/class.Stack.html) which displays only one
  of its children at once and lets you animate between them.

  ```ts
  const stack = new Gtk.Stack()

  stack.add_named(Gtk.Label.new("1"), "1")
  stack.add_named(Gtk.Label.new("2"), "2")

  stack.set_visible_child_name("2")
  ```

- [`ScrolledWindow`](https://docs.gtk.org/gtk4/class.ScrolledWindow.html)
  displays a single child in a viewport and adds scrollbars so that the whole
  widget can be displayed.

## Events

Gtk uses event controllers that you can assign to widgets that handle user
input. You can read more about event controllers on
[Gtk docs](https://docs.gtk.org/gtk4/input-handling.html#event-controllers-and-gestures).

Some common controllers:

- [EventControllerFocus](https://docs.gtk.org/gtk4/class.EventControllerFocus.html)
- [EventControllerKey](https://docs.gtk.org/gtk4/class.EventControllerKey.html)
- [EventControllerMotion](https://docs.gtk.org/gtk4/class.EventControllerMotion.html)
- [EventControllerScroll](https://docs.gtk.org/gtk4/class.EventControllerScroll.html)
- [GestureClick](https://docs.gtk.org/gtk4/class.GestureClick.html)
- [GestureDrag](https://docs.gtk.org/gtk4/class.GestureDrag.html)
- [GestureSwipe](https://docs.gtk.org/gtk4/class.GestureDrag.html)

```ts
let widget: Gtk.Widget

const gestureClick = new Gtk.GestureClick({
  propagationPhase: Gtk.PropagationPhase.BUBBLE,
})

gestureClick.connect("pressed", () => {
  console.log("clicked")
  return true
})

widget.add_controller(gestureClick)
```

Gtk provides widgets for various forms of user input so you might not need an
event controller.

- [`Button`](https://docs.gtk.org/gtk4/class.Button.html)
- [`Switch`](https://docs.gtk.org/gtk4/class.Switch.html)
- [`Scale`](https://docs.gtk.org/gtk4/class.Scale.html)
- [`Entry`](https://docs.gtk.org/gtk4/class.Entry.html)

# Hyprland

Library and CLI tool for monitoring the
[Hyprland socket](https://wiki.hyprland.org/IPC/).

## Usage

You can browse the
[Hyprland reference](https://aylur.github.io/libastal/hyprland).

### CLI

```sh
astal-hyprland # starts monitoring
```

### Library

:::code-group

```js [<i class="devicon-javascript-plain"></i> JavaScript]
import Hyprland from "gi://AstalHyprland"

const hyprland = Hyprland.get_default()

for (const client of hyprland.get_clients()) {
  print(client.title)
}
```

```py [<i class="devicon-python-plain"></i> Python]
from gi.repository import AstalHyprland as Hyprland

hyprland = Hyprland.get_default()

for client in hyprland.get_clients():
    print(client.get_title())
```

```lua [<i class="devicon-lua-plain"></i> Lua]
local Hyprland = require("lgi").require("AstalHyprland")

local hyprland = Hyprland.get_default()

for _, c in ipairs(hyprland.clients) do
    print(c.title)
end
```

```vala [<i class="devicon-vala-plain"></i> Vala]
// Not yet documented
```

:::

## Installation

1. install dependencies

   :::code-group

   ```sh [<i class="devicon-archlinux-plain"></i> Arch]
   sudo pacman -Syu meson vala valadoc json-glib gobject-introspection
   ```

   ```sh [<i class="devicon-fedora-plain"></i> Fedora]
   sudo dnf install meson vala valadoc json-glib-devel gobject-introspection-devel
   ```

   ```sh [<i class="devicon-ubuntu-plain"></i> Ubuntu]
   sudo apt install meson valac valadoc libjson-glib-dev gobject-introspection
   ```

   :::

2. clone repo

   ```sh
   git clone https://github.com/aylur/astal.git
   cd astal/lib/hyprland
   ```

3. install

   ```sh
   meson setup build
   meson install -C build
   ```

   # First Widgets

On this page you will learn about the JSX syntax. To learn about it more in
depth you can read the [Gnim docs](https://aylur.github.io/gnim/jsx.html).

> [!TIP]
>
> `gnim` is reexported from the `ags` module.

## Entry point of applications

Every application's entry point is an `app.start` invocation. `app` is a
singleton instance of
[Astal.Application](https://aylur.github.io/libastal/astal4/class.Application.html).

```ts [<i class="devicon-typescript-plain"></i> app.ts]
import app from "ags/gtk4/app"

app.start({
  main() {
    // you will instantiate Widgets here
    // and setup anything else if you need
  },
})
```

## Root of every shell component: Window

Desktop Shells are composed of widgets. A widget is a piece of UI that has its
own logic and style. A widget can be as small as a button or an entire bar. The
top level - also known as a root - widget is always a
[Window](https://aylur.github.io/libastal/astal4/class.Window.html).

```tsx [widget/Bar.tsx]
function Bar(monitor = 0) {
  return (
    <window class="Bar" monitor={monitor}>
      <box>Content of the widget</box>
    </window>
  )
}

app.start({
  main() {
    Bar(0)
    Bar(1) // instantiate for each monitor
  },
})
```

## Creating and nesting widgets

Widgets are JavaScript functions which return `GObject.Object` (usually
`Gtk.Widget`) instances by using JSX expressions.

:::code-group

```tsx [MyButton.tsx]
function MyButton() {
  return (
    <button onClicked={(self) => console.log(self, "clicked")}>
      <label label="Click me!" />
    </button>
  )
}
```

:::

Now that you have declared `MyButton`, you can nest it into another component.

```tsx
function MyBar() {
  return (
    <window>
      <box>
        Click The button
        <MyButton />
      </box>
    </window>
  )
}
```

Notice that widgets you defined start with a capital letter `<MyButton />`.
Lowercase tags are builtin [intrinsic](./intrinsics) widgets, while capital
letter is for custom widgets.

## Displaying Data

JSX lets you put markup into JavaScript. Curly braces let you “escape back” into
JavaScript so that you can embed some variable from your code and display it.

```tsx
function MyWidget() {
  const label = "hello"

  return <button>{label}</button>
}
```

You can also pass JavaScript to markup attributes

```tsx
function MyWidget() {
  const label = "hello"

  return <button label={label} />
}
```

## Conditional Rendering

You can use the same techniques as you use when writing regular JavaScript code.
For example, you can use an if statement to conditionally include JSX:

```tsx
function MyWidget() {
  let content

  if (condition) {
    content = <True />
  } else {
    content = <False />
  }

  return <box>{content}</box>
}
```

You can also inline a
[conditional `?`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Conditional_operator)
(ternary) expression.

```tsx
function MyWidget() {
  return <box>{condition ? <True /> : <False />}</box>
}
```

When you don’t need the `else` branch, you can also use a shorter
[logical && syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_AND#short-circuit_evaluation):

```tsx
function MyWidget() {
  return <box>{condition && <True />}</box>
}
```

> [!TIP]
>
> [falsy](https://developer.mozilla.org/en-US/docs/Glossary/Falsy) values are
> not rendered.

## Rendering lists

You can use
[`for` loops](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for)
or
[array `map()` function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map).

```tsx
function MyWidget() {
  const labels = ["label1", "label2", "label3"]

  return (
    <box>
      {labels.map((label) => (
        <label label={label} />
      ))}
    </box>
  )
}
```

## Widget signal handlers

You can respond to events by declaring event handler functions inside your
widget:

```tsx
import Gtk from "gi://Gtk"

function MyButton() {
  function onClicked(self: Gtk.Button) {
    console.log(self, "was clicked")
  }

  return <button onClicked={onClicked} />
}
```

## How properties are passed

Using JSX, a custom widget will always have a single object as its parameter.

```ts
type Props = {
  myprop: string
  children?: JSX.Element | Array<JSX.Element>
}

function MyWidget({ myprop, children }: Props) {
  //
}
```

> [!TIP]
>
> `JSX.Element` is an alias to `GObject.Object`

The `children` property is a special one which is used to pass the children
given in the JSX expression.

```tsx
// `children` prop of MyWidget is the box
return (
  <MyWidget myprop="hello">
    <box />
  </MyWidget>
)
```

```tsx
// `children` prop of MyWidget is [box, box]
return (
  <MyWidget myprop="hello">
    <box />
    <box />
  </MyWidget>
)
```

## State management

State is managed using signals. The most common signal you will use is
`createState` and `createBinding`. `createState` is a writable signal while
`createBinding` will be used to hook into GObject properties.

:::code-group

```tsx [State example]
import { createState } from "ags"

function Counter() {
  const [count, setCount] = createState(0)

  function increment() {
    setCount((v) => v + 1)
  }

  const label = count((num) => num.toString())

  return (
    <box>
      <label label={label} />
      <button onClicked={increment}>Click to increment</button>
    </box>
  )
}
```

```tsx [GObject example]
import GObject, { register, property } from "ags/gobject"
import { createBinding } from "ags"

@register()
class CountStore extends GObject.Object {
  @property(Number) counter = 0
}

function Counter() {
  const count = new CountStore()

  function increment() {
    count.counter += 1
  }

  const counter = createBinding(count, "counter")
  const label = counter((num) => num.toString())

  return (
    <box>
      <label label={label} />
      <button onClicked={increment}>Click to increment</button>
    </box>
  )
}
```

:::

Signals can be called as a function which lets you transform its value. In the
case of a `Gtk.Label` in this example, its label property expects a string, so
it needs to be turned to a string first.

## Dynamic rendering

When you want to render based on a value, you can use the `<With>` component.

```tsx
import { With, Accessor } from "ags"

let value: Accessor<{ member: string } | null>

return (
  <box>
    <With value={value}>
      {(value) => value && <label label={value.member} />}
    </With>
  </box>
)
```

> [!TIP]
>
> In a lot of cases it is better to always render the component and set its
> `visible` property instead

<!-- -->

> [!WARNING]
>
> When the value changes and the widget is re-rendered the previous one is
> removed from the parent component and the new one is _appended_. Order of
> widgets are _not_ kept so make sure to wrap `<With>` in a container to avoid
> it. This is due to Gtk not having a generic API on containers to sort widgets.

## Dynamic list rendering

The `<For>` component let's you render based on an array dynamically. Each time
the array changes it is compared with its previous state. Widgets for new items
are inserted while widgets associated with removed items are removed.

```tsx
import { For, Accessor } from "ags"

let list: Accessor<Array<any>>

return (
  <box>
    <For each={list}>
      {(item, index: Binding<number>) => (
        <label label={index.as((i) => `${i}. ${item}`)} />
      )}
    </For>
  </box>
)
```

> [!WARNING]
>
> Similarly to `<With>`, when the list changes and a new item is added it is
> simply **appended** to the parent. Order of widgets are not kept so make sure
> to wrap `<For>` in a container to avoid this.

# Builtin Intrinsic Elements

These are just Gtk widgets which can be used without explicitly importing. For
example `<box />` and `<Gtk.Box />` are exactly the same thing.

## Gtk4

### box

[Gtk.Box](https://docs.gtk.org/gtk4/class.Box.html)

```tsx
<box orientation={Gtk.Orientation.HORIZONTAL}>
  <Child />
  <Child />
  <Child />
</box>
```

### button

[Gtk.Button](https://docs.gtk.org/gtk4/class.Button.html)

```tsx
<button onClicked={() => print("clicked")}>
  <Child />
</button>
```

### centerbox

[Gtk.CenterBox](https://docs.gtk.org/gtk4/class.CenterBox.html)

```tsx
<centerbox orientation={Gtk.Orientation.HORIZONTAL}>
  <Child $type="start" />
  <Child $type="center" />
  <Child $type="end" />
</centerbox>
```

### drawingarea

[Gtk.DrawingArea](https://docs.gtk.org/gtk4/class.DrawingArea.html)

```tsx
<drawingarea
  $={(self) =>
    self.set_draw_func((area, cr, width, height) => {
      //
    })
  }
/>
```

### entry

[Gtk.Entry](https://docs.gtk.org/gtk4/class.Entry.html)

```tsx
<entry
  placeholderText="Start typing..."
  text=""
  onNotifyText={({ text }) => print(text)}
/>
```

### image

[Gtk.Image](https://docs.gtk.org/gtk4/class.Image.html)

```tsx
<image
  file="/path/to/file.png"
  iconName="system-search-symbolic"
  pixelSize={16}
/>
```

### label

[Gtk.Label](https://docs.gtk.org/gtk4/class.Label.html)

```tsx
<label
  label="<span foreground='blue'>text</span>"
  useMarkup
  wrap
  ellipsize={Pango.EllipsizeMode.END}
/>
```

### levelbar

[Gtk.LevelBar](https://docs.gtk.org/gtk4/class.LevelBar.html)

```tsx
<levelbar
  orientation={Gtk.Orientation.HORIZONTAL}
  widthRequest={200}
  value={0.5}
/>
```

### menubutton

[Gtk.MenuButton](https://docs.gtk.org/gtk4/class.MenuButton.html)

```tsx
<menubutton>
  button content
  <popover>popover content</popover>
</menubutton>
```

### overlay

[Gtk.Overlay](https://docs.gtk.org/gtk4/class.Overlay.html)

```tsx
<overlay>
  <Child />
  <Child $type="overlay" />
  <Child $type="overlay" />
</overlay>
```

### revealer

[Gtk.Revealer](https://docs.gtk.org/gtk4/class.Revealer.html)

```tsx
<revealer
  transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
  revealChild={true}
  onNotifyChildRevealed={() => print("animation finished")}
>
  <Child />
</revealer>
```

### scrolledwindow

[Gtk.ScrolledWindow](https://docs.gtk.org/gtk4/class.ScrolledWindow.html)

```tsx
<scrolledwindow maxContentHeight={500}>
  <Child />
</scrolledwindow>
```

### slider

[Astal.Slider](https://aylur.github.io/libastal/astal4/class.Slider.html)

```tsx
<slider
  value={0.5}
  min={0}
  max={1}
  onChangeValue={({ value }) => print(value)}
/>
```

### stack

[Gtk.Stack](https://docs.gtk.org/gtk4/class.Stack.html)

```tsx
<stack $={(self) => (self.visibleChildName = "child2")}>
  <Child $type="named" name="child1" />
  <Child $type="named" name="child2" />
</stack>
```

### switch

[Gtk.Switch](https://docs.gtk.org/gtk4/class.Switch.html)

```tsx
<switch active={true} onNotifyActive={({ active }) => print(active)} />
```

### togglebutton

[Gtk.ToggleButton](https://docs.gtk.org/gtk4/class.ToggleButton.html)

```tsx
<togglebutton active={true} onToggled={({ active }) => print(active)} />
```

### window

[Astal.Window](https://aylur.github.io/libastal/astal4/class.Window.html)

```tsx
<window
  visible
  namespace="bar"
  class="Bar"
  monitor={0}
  exclusivity={Astal.Exclusivity.EXCLUSIVE}
  keymode={Astal.Keymode.ON_DEMAND}
  anchor={
    Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT
  }
/>
```

## Gtk3

### box

[Gtk.Box](https://docs.gtk.org/gtk3/class.Box.html)

```tsx
<box orientation={Gtk.Orientation.HORIZONTAL}>
  <Child />
  <Child />
  <Child />
</box>
```

### button

[Gtk.Button](https://docs.gtk.org/gtk3/class.Button.html)

```tsx
<button onClicked={() => print("clicked")}>
  <Child />
</button>
```

### centerbox

[Astal.CenterBox](https://aylur.github.io/libastal/astal3/class.CenterBox.html)

```tsx
<centerbox orientation={Gtk.Orientation.HORIZONTAL}>
  <Child $type="start" />
  <Child $type="center" />
  <Child $type="end" />
</centerbox>
```

### circularprogress

[Astal.CircularProgress](https://aylur.github.io/libastal/astal3/class.CircularProgress.html)

```tsx
<circularprogress value={0.5} startAt={0.75} endAt={0.75}>
  <icon />
</circularprogress>
```

```css
circularprogress {
  color: green;
  background-color: black;
  font-size: 6px;
  margin: 2px;
  min-width: 32px;
}
```

### drawingarea

[Gtk.DrawingArea](https://docs.gtk.org/gtk3/class.DrawingArea.html)

```tsx
<drawingarea
  onDraw={(self, cr) => {
    //
  }}
/>
```

### entry

[Gtk.Entry](https://docs.gtk.org/gtk3/class.Entry.html)

```tsx
<entry
  onChanged={({ text }) => print("text changed", text)}
  onActivate={({ text }) => print("enter", text)}
/>
```

### eventbox

[Astal.EventBox](https://aylur.github.io/libastal/astal3/class.EventBox.html)

```tsx
<eventbox
  onClick={(_, event) => {
    print(event.modifier, event.button)
  }}
/>
```

### icon

[Astal.Icon](https://aylur.github.io/libastal/astal3/class.Icon.html)

```tsx
<icon
  // named icon or path to a file
  icon="/path/to/file.png"
  icon="missing-symbolic"
/>
```

```css
icon {
  font-size: 16px;
}
```

### label

[Astal.Label](https://aylur.github.io/libastal/astal3/class.Label.html)

```tsx
<label label="hello" maxWidthChars={16} wrap />
```

### levelbar

[Astal.LevelBar](https://aylur.github.io/libastal/astal3/class.LevelBar.html)

```tsx
<levelbar value={0.5} widthRequest={200} />
```

### overlay

[Astal.Overlay](https://aylur.github.io/libastal/astal3/class.Overlay.html)

```tsx
<overlay>
  <Child>child</Child>
  <Child>overlay 1</Child>
</overlay>
```

### revealer

[Gtk.Revealer](https://docs.gtk.org/gtk3/class.Revealer.html)

```tsx
<revealer
  transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
  revealChild={true}
  onNotifyChildRevealed={() => print("animation finished")}
>
  <Child />
</revealer>
```

### scrollable

[Astal.Scrollable](https://aylur.github.io/libastal/astal3/class.Scrollable.html)

```tsx
<scrollable heightRequest={100}>
  <Child />
</scrollable>
```

### slider

[Astal.Slider](https://aylur.github.io/libastal/astal3/class.Slider.html)

```tsx
<slider widthRequest={100} onDragged={({ value }) => print(value)} />
```

### stack

[Astal.Stack](https://aylur.github.io/libastal/astal3/class.Stack.html)

```tsx
<stack $={(self) => (self.visibleChildName = "child2")}>
  <Child name="child1" />
  <Child name="child2" />
</stack>
```

### switch

[Gtk.Switch](https://docs.gtk.org/gtk3/class.Switch.html)

```tsx
<switch active={true} onNotifyActive={({ active }) => print(active)} />
```

### overlay

[Astal.Overlay](https://aylur.github.io/libastal/astal3/class.Overlay.html)

```tsx
<overlay>
  <Child>child</Child>
  <Child>overlay 1</Child>
  <Child>overlay 1</Child>
</overlay>
```

### togglebutton

[Gtk.ToggleButton](https://docs.gtk.org/gtk4/class.ToggleButton.html)

```tsx
<togglebutton active={true} onToggled={({ active }) => print(active)} />
```

### window

[Astal.Window](https://aylur.github.io/libastal/astal4/class.Window.html)

```tsx
<window
  visible
  namespace="bar"
  class="Bar"
  monitor={0}
  exclusivity={Astal.Exclusivity.EXCLUSIVE}
  keymode={Astal.Keymode.ON_DEMAND}
  anchor={
    Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT
  }
/>
`

``

# Theming

Since the widget toolkit is **GTK** theming is done with **CSS**.

- [CSS tutorial](https://www.w3schools.com/css/)
- Gtk4
  - [GTK4 CSS Overview wiki](https://docs.gtk.org/gtk4/css-overview.html)
  - [GTK4 CSS Properties Overview wiki](https://docs.gtk.org/gtk4/css-properties.html)
- Gtk3
  - [GTK3 CSS Overview wiki](https://docs.gtk.org/gtk3/css-overview.html)
  - [GTK3 CSS Properties Overview wiki](https://docs.gtk.org/gtk3/css-properties.html)

> [!WARNING] GTK is not the web
>
> While most features are implemented in GTK, you can't assume anything that
> works on the web will work with GTK. Refer to the GTK docs to see what is
> supported.

## Loading static stylesheets

You can import any `css` or `scss` file which will be inlined as a string which
you can pass to the css property.

:::code-group

```ts [app.ts]
import css from "./style.css"
import scss from "./style.scss"

const inlineCss = `
  window {
    background-color: transparent;
  }
`

app.start({
  css: css,
  css: scss,
  css: inlineCss,
})
```

:::

## Css Property on Widgets

You should always prefer to style using class names and stylesheets. But in
those rare cases when you need apply a style based on a JavaScript value you can
use the `css` property.

```tsx
<box css="padding 1em; border: 1px solid red;" />
```

> [!WARNING]
>
> The `css` property of a widget will not cascade to its children. You should
> generally avoid using `css` and instead use `class` and stylesheets.

## Apply Stylesheets at Runtime

You can apply additional styles at runtime.

```ts
app.apply_css("/path/to/file.css")
```

```ts
app.apply_css(`
  window {
    background-color: transparent;
  }
`)
```

```ts
app.reset_css() // reset if need
```

> [!WARNING]
>
> `apply_css()` will apply on top of other stylesheets applied before. You can
> reset stylesheets with `reset_css()`

## Inspector

If you are not sure about the widget hierarchy or any CSS selector, you can use
the [GTK inspector](https://wiki.gnome.org/Projects/GTK/Inspector)

:::code-group

```sh [ags]
ags inspect
```

```sh [astal]
astal --inspector
```

:::

# Notifd

A
[notification daemon](https://specifications.freedesktop.org/notification-spec/latest/)
implementation as a library and CLI tool.

## How it works

The first instantiation of the
[Notifd](https://aylur.github.io/libastal/notifd/class.Notifd.html) class will
become the daemon and every subsequent instantiation will queue up to act as the
daemon and will act as a client in the meantime. This means this library can be
used throughout multiple processes.

## Usage

You can browse the [Notifd reference](https://aylur.github.io/libastal/notifd).

### CLI

```sh
astal-notifd --help
```

### Library

:::code-group

```js [<i class="devicon-javascript-plain"></i> JavaScript]
import Notifd from "gi://AstalNotifd"

const notifd = Notifd.get_default()

notifd.connect("notified", (_, id) => {
  const n = notifd.get_notification(id)
  print(n.summary, n.body)
})
```

```py [<i class="devicon-python-plain"></i> Python]
from gi.repository import AstalNotifd as Notifd

notifd = Notifd.get_default()

def on_notified(_, id):
    n = notifd.get_notification(id)
    print(n.get_body(), n.get_body())

notifd.connect("notified", on_notified)
```

```lua [<i class="devicon-lua-plain"></i> Lua]
local Notifd = require("lgi").require("AstalNotifd")

local notifd = Notifd.get_default()

notifd.on_notified = function(_, id)
    local n = notifd.get_notification(id)
    print(n.body, n.summary)
end
```

```vala [<i class="devicon-vala-plain"></i> Vala]
// Not yet documented
```

:::

## Installation

1. install dependencies

   :::code-group

   ```sh [<i class="devicon-archlinux-plain"></i> Arch]
   sudo pacman -Syu meson vala valadoc gdk-pixbuf2 json-glib gobject-introspection
   ```

   ```sh [<i class="devicon-fedora-plain"></i> Fedora]
   sudo dnf install meson vala valadoc gdk-pixbuf2-devel json-glib-devel gobject-introspection-devel
   ```

   ```sh [<i class="devicon-ubuntu-plain"></i> Ubuntu]
   sudo apt install meson valac valadoc libgdk-pixbuf-2.0-dev libjson-glib-dev gobject-introspection
   ```

   :::

2. clone repo

   ```sh
   git clone https://github.com/aylur/astal.git
   cd astal/lib/notifd
   ```

3. install

   ```sh
   meson setup build
   meson install -C build
   ```


   1. Introduction to Tumbler

    What it is: Tumbler is a D-Bus thumbnailing service primarily used in the Xfce desktop environment.
    Purpose: It generates thumbnail images for various file types (like images, videos, documents) and stores them in a cache for faster access.
    How it works: Tumbler implements the thumbnail management D-Bus specification, allowing applications to request and receive thumbnails without directly handling the generation process itself.

2. D-Bus interaction

    D-Bus Service: Tumbler exposes a D-Bus service for applications to communicate with.
    D-Bus Interface: The primary interface for requesting thumbnails is org.freedesktop.thumbnails.Thumbnailer1.
    Object Path: The object path used to access this interface is /org/freedesktop/thumbnails/Thumbnailer1.
    Methods: Key methods include:
        Queue: Used to request the creation of thumbnails for one or more files.
        Dequeue: Used to cancel a pending thumbnail request.
        GetSupported: Returns a list of URI schemes and MIME types that Tumbler can handle.
        GetFlavors: Returns a list of supported thumbnail sizes (e.g., "normal", "large").
        GetSchedulers: Returns a list of available scheduling options for thumbnail generation.
    Signals: Tumbler emits signals to notify applications about the status of thumbnailing operations.
        Ready: Indicates that one or more thumbnails have been successfully generated.
        Started: Signals that a queued request has begun processing.
        Finished: Indicates that a queued request has completed (regardless of success or failure).
        Error: Emitted when an error occurs during thumbnail generation for specific files.

3. Thumbnail requests and handling

    Requesting Thumbnails: To request a thumbnail, your application needs to:
        Connect to the D-Bus session bus.
        Obtain a D-Bus proxy object for the Tumbler service at the specified object path and interface.
        Call the Queue method with the file URIs, MIME types, and desired thumbnail "flavor" (size).
    Thumbnail Cache: Tumbler stores thumbnails in a cache, typically located at $XDG_CACHE_HOME/thumbnails.
        $XDG_CACHE_HOME usually defaults to ~/.cache.
    Thumbnail Naming Convention: Thumbnails are named using the MD5 checksum of the file's URI and the .png extension, followed by the thumbnail size (e.g., md5sum.png). The Thumbnail Managing Standard provides details on this.
    Accessing Thumbnails: After receiving the Ready signal, your application can reconstruct the thumbnail's path based on the file URI and the thumbnail naming convention to load and display the thumbnail image.

4. Configuration and plugins

    tumbler.rc: Tumbler's behavior can be customized using the tumbler.rc configuration file.
        The default file is located at /etc/xdg/tumbler/tumbler.rc.
        Users can override the default by copying it to ~/.config/tumbler/tumbler.rc.
    Plugin Settings: The tumbler.rc file allows configuring individual thumbnailer plugins.
        Disabled: Enable or disable a specific plugin (true/false).
        Priority: Sets the priority for a plugin if multiple plugins can handle the same file type.
        Locations: Specifies the directory paths where the plugin should be active.
        Excludes: Defines paths where the plugin should not be used.
        MaxFileSize: Sets the maximum file size for which the plugin will generate thumbnails.
    Specialized Thumbnailers: Tumbler can also use external specialized thumbnailer services, registered at runtime, to handle specific URI schemes and MIME types.

5. Potential challenges

    High CPU Usage: tumblerd (the Tumbler daemon) can sometimes consume significant CPU, especially with large or frequently changing files.
        Possible solutions: Closing file managers, disabling specific plugins in tumbler.rc, or using a script to monitor and manage tumblerd.
    D-Bus Binding Libraries: Interacting with Tumbler requires using a D-Bus binding library for your chosen programming language, such as dbus-python or dbus-next.
    Error Handling: Robust applications should handle potential D-Bus errors and signals to ensure proper operation and user feedback.