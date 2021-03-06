#DQT 2.0

The new Loris Data Query Tool.

##Prerequisites

Before using this code, you must have the following prerequisites installed

* CouchDB >= 1.2 (http://couchdb.apache.org)
* Erica (https://github.com/benoitc/erica)

##Installation

First, create a CouchDB database using Futon (http://127.0.0.1:5984/\_utils/index.html).
In the following example, the database is named "dqg".

Next, clone this repository:

```bash
git clone git@github.com:aces/DQG-2.0.git
```

Finally, push to CouchDB using erica

```bash
cd DQG-2.0
erica push http://adminuser:adminpass@127.0.0.1:5984/dqg/
```

Visit http://127.0.0.1:5984/dqg/_design/DQG-2.0/_rewrite/ to ensure code was pushed.

##Populating data from Loris

Add a section to your Loris config.xml for CouchDB 

```xml
<CouchDB>
    <database>dqg</database>
    <hostname>localhost</hostname>
    <port>5984</port>
    <admin>adminuser</admin>
    <adminpass>adminpass</adminpass>
</CouchDB>
```

In your Loris tools directory run the CouchDB_Import_* scripts

```bash
cd $lorisroot/tools

#Import the base candidate data
php CouchDB_Import_Demographics.php

#Import the Loris instrument data
#This step is optional and not required if
#only the MRI portion of Loris is used
php CouchDB_Import_Instruments.php

#Import the Loris MRI data
#This step is optional and not required
#if the MRI portion of Loris isn't installed
php CouchDB_Import_MRI.php
```
