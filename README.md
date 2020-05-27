# irma-brp-opladen
De code in deze repository is bedoeld voor een [CA API Gateway](https://www.ca.com/us/products/ca-api-gateway.html) en kan niet zelfstandig draaien.

## Gebruik van de opladen service
Gemeente Nijmegen biedt een service aan waarmee attributen uit de testset van GBA-V als attribuut geladen kunnen worden in de IRMA applicatie.
Het gaat dan om attributen in het Demo domein van IRMA.
Deze service werkt zowel met DigiD (via de DigiD acceptatie omgeving) als zonder DigiD (zodat de IRMA QR code makkelijker gegeneerd kan worden).

### Gebruik met DigiD
Je hebt een of meer DigiD Preprod accounts nodig. Je kunt een DigiD Preprod account gebruiken van een DigiD Preprod aansluiting in je eigen organisatie. Bij elke aansluiting krijg je 5 accounts.
Het opladen proces start bij https://services-test.nijmegen.nl/irma/gemeente/start
Na een succesvolle DigiD authenticatie wordt de GBA-V geraadpleegd. Als het BSN daar gevonden is wordt er een QR code getoond die met de IRMA app gescand kan worden.

### Gebruik zonder DigiD
Er is weinig tot geen overlap tussen de BSN's die in de DigiD preprod omgeving gebruikt worden en de BSN's die voorkomen in de GBA-V testset.
In de acceptatie omgeving is het daarom mogelijk om de QR code te genereren met een zelfgekozen BSN, zonder gebruik te maken van DigiD.
[De complete GBA-V testset is hier](https://www.rvig.nl/documenten/richtlijnen/2018/09/20/testdataset-persoonslijsten-proefomgevingen-gba-v) te vinden.
- Een BSN dat voorkomt in de GBA-v testset kan via een query parameter worden meegegeven
- Het element '08.11.15' moet een straatnaam bevatten; dat is een verplicht attribuut in IRMA. Kies dus een BSN waar dat element gevuld is.
    bijvoorbeeld test-BSN '999994190'.
- https://services-test.nijmegen.nl/irma/gemeente/issue-manual?bsn=999994190&zhn=25
- het tweede argument (&zhn=) is het gewenste zekerheidsniveau.
    Geldige waarden zijn: '10', '20', 25' of '30'. Die komen overeen met respectievelijk 'Basis', 'Midden', 'Substantieel' en 'Hoog' als DigiD betrouwbaarheidsniveau.

Als alles goed gaat krijg je een QR code te zien die je kunt scannen met de IRMA applicatie.
Wanneer je een credential al hebt dan wordt die overschreven.

### BRP gegevens mbv een bestaand BSN in IRMA
In de test omgeving is het ook mogelijk om gegevens uit de GBA-V testset op te halen obv een BSN uitgegeven in het irma-demo.chipsoft schema.
Via deze url kun je jezelf een BSN credential geven: https://privacybydesign.foundation/attribute-index/en/irma-demo.chipsoft.bsn.html
Door op deze pagina https://services-test.nijmegen.nl/irma/gemeente/start te kiezen voor 'inloggen met IRMA' kun je het Chipsoft BSN gebruiken om de bijbehorende GBA-V gegevens op te halen.
'Inloggen met IRMA' werkt ook icm een BSN dat je eerder via een DigiD authenticatie in IRMA hebt geladen.

Deze functionalitateit is vooralsnog alleen in de test omgeving beschikbaar.

## Opladen met echte BRP gegevens
De opladen service is ook beschikbaar om echte BRP data in de IRMA app te laden, die zijn opgenomen in het productie schema van IRMA.
In deze omgeving is inloggen met DigiD (niveau midden) verplicht, en is er geen mogelijkheid om zelf een BSN op te geven.
Het laden van echte BRP gegevens kan hier: https://services.nijmegen.nl/irma/gemeente/start


## Beschikbare credentials en attributen
Hier is terug te vinden welke credentials en attributen beschikbaar zijn: https://github.com/privacybydesign/irma-demo-schememanager/tree/master/gemeente/Issues

## IRMA
For more information about IRMA, see: https://privacybydesign.foundation/irma/

The IRMA client apps can be downloaded from their respective app stores:

    Apple App Store
    Google Play Store

Other components in the IRMA ecosystem include:

    IRMA Android app
    IRMA iOS app
    IRMA API server

