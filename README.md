# irma-brp-opladen
De code in deze repository is bedoeld voor een [CA API Gateway](https://www.ca.com/us/products/ca-api-gateway.html) en kan niet zelfstandig draaien.

## Gebruik van de opladen service
Gemeente Nijmegen biedt een service aan waarmee attributen uit de testset van GBA-V als attribuut geladen kunnen worden in de IRMA applicatie.
Het gaat dan om attributen in het Demo domein van IRMA.
Deze service werkt zowel met DigiD (via de DigiD acceptatie omgeving) als zonder DigiD (zodat de IRMA QR code makkelijker gegeneerd kan worden).

### Gebruik met DigiD
Je hebt een of meer DigiD Preprod accounts nodig. Je kunt een DigiD Preprod account gebruiken van een DigiD Preprod aansluiting in je eigen organisatie. Bij elke aansluiting krijg je 5 accounts.
Het opladen proces start bij https://services-test.nijmegen.nl/irma/issue/start
Na een succesvolle DigiD authenticatie wordt de GBA-V geraadpleegd. Als het BSN daar gevonden is wordt er een QR code getoond die met de IRMA app gescand kan worden.

### Gebruik zonder DigiD
Er is weinig tot geen overlap tussen de BSN's die in de DigiD preprod omgeving gebruikt worden en de BSN's die voorkomen in de GBA-V testset.
In de acceptatie omgeving is het daarom mogelijk om de QR code te genereren met een zelfgekozen BSN, zonder gebruik te maken van DigiD.
[De complete GBA-V testset is hier](https://www.rvig.nl/actueel/nieuws/2018/09/21/nieuwe-versie-testdatabase-proefomgevingen-gba-v-en-bv-bsn) te vinden.
- zorg dat je in je browser een http-header kunt zetten
- zet in de http-header 'X-Nijm-subscriber-id' een BSN die voorkomt in de GBA-V testset
- Het element '08.11.15' moet een straatnaam bevatten; dat is een verplicht attribuut in IRMA. Kies dus een BSN waar dat element gevuld is.
    bijvoorbeeld test-BSN '999994190'.
- voeg en 2e http-header toe met als naam 'zekerheidsniveau' en als waarde '10', '20', 25' of '30'. Die komen overeen met respectievelijk 'Basis', 'Midden', 'Substantieel' en 'Hoog' als DigiD betrouwbaarheidsniveau.
- open de url 'https://services-test.nijmegen.nl/irma/issue-secured' in de browser

Als alles goed gaat krijg je een QR code te zien die je kunt scannen met de IRMA applicatie.
Wanneer je een credential al hebt dan wordt die overschreven.


## Opladen met echte BRP gegevens
Binnenkort is de opladen service ook beschikbaar om echte BRP data in de IRMA app te laden, die zijn opgenomen in het productie schema van IRMA.
In deze omgeving is inloggen met DigiD (niveau midden) verplicht, en is er geen mogelijkheid om zelf een BSN op te geven.

## Beschikbare credentials en attributen
Hier is terug te vinden welke credentials en attributen in de Demo omgeving beschikbaar zijn: https://github.com/privacybydesign/irma-demo-schememanager/tree/master/nijmegen/Issues

De credentials en attributen voor de productie omgeving zijn hier terug te vinden:
https://github.com/privacybydesign/pbdf-schememanager/tree/master/pbdf/Issues

## IRMA
For more information about IRMA, see: https://privacybydesign.foundation/irma/

The IRMA client apps can be downloaded from their respective app stores:

    Apple App Store
    Google Play Store

Other components in the IRMA ecosystem include:

    IRMA Android app
    IRMA iOS app
    IRMA API server

