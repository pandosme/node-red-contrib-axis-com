# node-red-contrib-axis-com

Nodes to simplify integration with Axis devices. See examples.

<a href="https://www.buymeacoffee.com/fredjuhlinl" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>

This node replaces the following nodes that are deprecated
* node-red-contrib-device
* node-red-contrib-acap
* node-red-contrib-security


## Device Node
Common device management actions.
* Device info
* Connections
* Syslog
* Set name
* Set time
* Set location
* Restart
* Upgrade firmware
* VAPIX GET
* VAPIX POST
* SOAP POST

## Camera Node
Common camera actions
* JPEG image
* Camera info
* Get/Set image settings
* List recordings (SD Card and NAS)
* Start/Stop recording
* Set video filter

## ACAP Node
Common ACAP actions
* List ACAP and status
* Start/Stop/Remove ACAP
* Install ACAP

## Security Node
Common device security controls actions
* List device accounts
* Set/Update/Remove account
* Enable/disable discovery protocols
* Enable/Disable SSH
* Set SSH user
* Set Firewall (IP Tables)
* List certificates
* Generate CSR
* Install certificate
* Set HTTPS (certificte)

## History

### 1.8.3
- Improved exceptionhandling when invalid network address is used
- Allow any account name (beside root) to be added/intialized on a factory default device

### 1.8.2
- Fixed flaw device firmware upgrade

### 1.8.1
- Fixed flaw introduced in 1.8.0

### 1.8.0
- Refactoring exception handling.  Trown errors are now more consistant and informative.
- Device request that responds with JSON will now throw an error on 200 OK if the JSON has a property "error"

### 1.7.0
- Fixed and updated file upload functions for ACAP and Camera overlay image.

### 1.6.1
- In Axis Camera, reintroduced overlay update.

### 1.6.0
- In Axis Device, reintroduced firmware upgrade in from a local file as that approach is much more efficient that providing dile buffer data.

### 1.5.0
- Bug fixes

### 1.4.2
- Fixed node recording | stopped

### 1.4.1
- Fixed a clumsy flaw that broke Device Node when updating to 1.4.0

### 1.4.0
- Added support for HTTP Patch in the Device node
- Fixed aa faulty error response on Camera SD Card Stop Recording when the operation was actually successful.
- Removed the resolution selection in Camera SD Cardt Start recording as it had no impact.

### 1.3.0
- Added support to set SSH user introduced in firmware 11.5.x
- Added support for HTTP Put in Device node

### 1.2.3
- Fixed flaw caused error when upgrading firmware

### 1.2.2
- Fixed flaw that prevented reading the DeviceInfo from devices with older firmware

### 1.2.1
- Ability to get device info without authentication.  If authetication fails, basic device info is provided withot an error is thrown.
- Minor fixes

### 1.1.5
- Extended device info with support for more Axis models

### 1.1.4
- Fixed faulty links in package.json

### 1.1.3 
- Fixed a flaw listing certificates when device responds with >= 400 error code

### 1.0.3 
First commit
