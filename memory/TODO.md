# TODO

- [x] Add `STRIPE_WEBHOOK_SECRET` to Vercel env vars before going live
- [x] Mobile optimization — make all pages responsive (profile, detail pages, filters, etc.)
- [x] Mine Nedlastninger — cover photo not showing on download items
- [ ] Fix anonymous purchases — require login before checkout so purchases always have a buyer_id and appear in Mine Nedlastninger
- [ ] Remove `payout_released_at` column from purchases table if escrow won't be re-implemented (keep if it will)
- [ ] Fix Discord embed play button — `twitter:player` approach not working, investigate alternatives
- [x] Add more padding in the hero component
- [x] Make "Skala" (key) optional when uploading a beat
- [x] Make "VST/Plugins brukt" mandatory when uploading a remake
- [x] Add VST/Plugins field to regular beat uploads as well
- [x] Add DAW field to beat uploads (which DAW it was produced in)
- [x] Add bottom audio player on remakes, samples, presets, preset packs, and sample packs pages (like the one on låter)
- [x] Add artist name on remake card
- [x] Change "Kontakt oss" to link to /kontaktoss page with "Kontakt oss på russeartister@gmail.com"
- [x] Allow multi-select VST filtering on remakes page (currently single-select only), and add option to exclude VSTs
- [x] Fix reusable image cropper modal component
- [x] Make the audioplayer x actually work so it closes the audioplayer
- [ ] Let artists change their banner photo
- [x] Let artists edit the cover image of a card
- [x] Remove "remake av" on remake cards
- [x] Send an email verification if you want to change the password of your user
- [x] Make all links a pointer so the mouse turns into a pointer
- [ ] Set DAW in checkoutpage

- [] Write better text in Vilkår and Personvern
- [X] Sample pack/preset pack layout til Splice
- [X] Add a "connect stripe" directly next to the price (gratis) so people don't get confused

- [] Fix VST filter being too wide in remakes
- [] Fix kick etc. too wide on samples

- [X] Max 5 lines per thing in profile page
- [X] Fikse så du kun laster opp "Pakker" istedenfor enten preset packs ELLER sample packs

## Ikke-hastende oppgaver

- [ ] Profilside: "Se mer" med gradient-fade på 6. element, maks 5 synlige per seksjon (låter, samples, remakes, pakker). Klikk for å utvide.
- [ ] VST-duplikater: Normaliser CamelCrusher/Camelcrusher, Sylenth/Sylenth1 osv. til én variant. Trenger alias-mapping.
- [ ] Dynamisk VST-filtrering på remakes: Når en VST er valgt, vis kun andre VSTs som finnes i de gjenstående resultatene. Fjern irrelevante tags fra filteret.

- [] Legg til loading bar på alle uploads

- [] Må være mulig å selecte fler ting på samples (kick, clap og hi hat loop på en gang liksom)

## Errors / URGENT

- [] Nettsiden har nå blitt utrolig treg
- [] Remake BPM blir feil (120 hver gang?)

- [] hvis jeg skriver inn "Ser" også trykker på "serum" tabben som dukker opp, så kommer "ser" som pluginen, ikke serum






## Framover (Ikke gjør noe med dette enda)
- [] Implementere annonser/gigs? Enkel løsning til å begynne med som vi kan utvide til "Fiks ferdig" senere.

- [] Adde en "like" knapp, der det også står hvor mange som har liket den

- [] Adde en report knapp, hvis antallet reports overstiger 3 sendes automatisk mail til russeartister@gmail.com

## Pakkeupload-flow

To valg etter du har trykket på "last opp pakke":

Legg til automatisk | Legg til manuelt
(dra inn zip fil) | 

Automatisk:
- Akkurat samme måte som du gjør manuelt, men filer er allerede lagt inn, og navn er allerede fylt ut fra zip filen, du kan endre dette. Og du kan legge til bpm osv, samt justere om hva som skal forhåndsvises osv.

Da skal man helst klare å separere .wav / .mp3 (samples) fra .fxp osv (presets). Det finnes utrolig mange forskjellige endinger på en preset fil vil jeg tro, så dette kan kanskje være vanskeligere



Manuelt:
- Du legger inn manuelt akkurat som normalt

- [X] Må finnes en bedre løsning å aktivere forhåndsvisning på, flowen nå er forvirrende

- [X] Nå mangler det audiocard på pakker, dette må addes.

- [] Legg til * ved siden av lydfil uansett på lastopp pack
- [X] Flytt packs til første tab så det blir "Pakker" - "Samples" - "Presets"
- [X] Gjør "Legg til" knapp hvit 
- [X] Nå er det sånn at én av samplesene automatisk blir pakkens forhåndsvisning, det er feil. Hvis jeg ikke eksplisitt har gått inn og lagt til en forhåndsvisning for pakken, ikke ha en play knapp der.

- [X] Går ikke an å laste ned packs 
(:3000/api/free-download?type=pack&id=91390c18-e598-4d27-8bc2-332b14a0ee8a:1  Failed to load resource: the server responded with a status of 404 (Not Found)), mistenker at dette er fordi det ikke blir en .zip fil automatisk? Dette må det bli.


- [X] Etter man har uploadet en pakke så kommer man til https://www.russeartister.no/packs, jeg vet ikke engang hvorfor vi fortsatt har den men du skal i hvert fall ikke redirectes her

- [] Preview må være en kortere versjon av sangen
- [] 