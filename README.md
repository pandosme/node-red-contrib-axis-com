# node-red-contrib-axis-com

Nodes to simplify integration with Axis devices. See examples.

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
* Set Firewall (IP Tables)
* List certificates
* Generate CSR
* Install certificate
* Set HTTPS (certificte)

## History

### 1.1.4
- Fixed faulty links in package.json

### 1.1.3 
- Fixed a flaw listing certificates when device responds with >= 400 code

### 1.0.3 
First commit

### 1.1.0 
- Bug fixes
- Cleanup
