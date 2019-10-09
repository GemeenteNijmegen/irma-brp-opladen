The files in this directory contain the logic for transforming a BRP record to a json message that is send to a IRMA-server for issueing of the BRP attributes.
######brp_api_response.json
this file is an example of the json that is send to a IRMA server while issuing

######calculateAgeLimits.java
this file contains the logic to set the 'Over16, Over21' etc attributes.
A BRP record can contain an invalid birthdate, e.g. 0-0-1985. This is mostly in cases where a person migrated to the Netherlands and a birhtdate couldn't be established.
This code maps a birtmonth of '0' to the month of july (a rule also used by other goverment agencies). A birthday of 0 is mapped to the latest day in the birth month.

######T&TIrma.xml
This stylesheet contains most of the logic. The highlights are:
- Line 17 checks for deceased persons and only returns `<Persoon><overleden>ja</overleden></Persoon>`
- From line 32 to line 208 there's a lot of logic for formatting the surname based on the given name, partner name or combination of those and handling BRP inconsistenties (a space character after a name)
- Line 251: The attribute `housenumber` in IRMA is a concatenation of different BRP fields
- line 263: some edgecase where a person can have a invalid cityname when that person also exists in the `RNI` (`Register niet ingezetenen`)