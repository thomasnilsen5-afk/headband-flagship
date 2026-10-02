import { brand } from '@/lib/brand'

/**
 * DRAFT legal copy, written against Norwegian consumer law (forbrukerkjøpsloven,
 * angrerettloven, personopplysningsloven/GDPR, ekomloven) and Forbrukertilsynet's standard
 * terms. It MUST be reviewed by a lawyer before launch; every page renders a draft notice
 * until LEGAL_REVIEWED is true.
 */
export const LEGAL_REVIEWED = false
export const LEGAL_UPDATED = '2026-10-02'

export type LegalDoc = { title: string; intro: string; sections: { h: string; p: string[] }[] }
export type LegalKey = 'terms' | 'returns' | 'privacy' | 'cookies'

const a = brand.address
const seller = `${brand.legalName}, org.nr. ${brand.orgNumber}, ${a.street}, ${a.postalCode} ${a.city}`

export const legal: Record<'nb' | 'en', Record<LegalKey, LegalDoc>> = {
  nb: {
    terms: {
      title: 'Kjøpsvilkår',
      intro: `Disse vilkårene gjelder for salg av varer fra ${brand.name} til forbrukere. Kjøpet reguleres i tillegg av forbrukerkjøpsloven, angrerettloven, avtaleloven og e-handelsloven, som gir deg rettigheter vilkårene ikke kan innskrenke.`,
      sections: [
        {
          h: '1. Partene',
          p: [
            `Selger er ${seller}, ${brand.email}. Kjøper er forbrukeren som legger inn bestillingen.`,
          ],
        },
        {
          h: '2. Avtalen',
          p: [
            'Avtalen er bindende når vi har bekreftet bestillingen på e-post. Er det åpenbare feil i pris eller beskrivelse, gjelder ikke avtalen, og vi gir deg beskjed så raskt som mulig.',
          ],
        },
        {
          h: '3. Priser',
          p: [
            'Alle priser er oppgitt i norske kroner og inkluderer 25 % merverdiavgift. Frakt vises før du betaler. Ved levering til Svalbard eller utenfor Norge trekkes norsk mva. fra; eventuell toll og importmva. i mottakerlandet betales av kjøper.',
          ],
        },
        {
          h: '4. Betaling',
          p: [
            'Vi tar imot Vipps MobilePay, kort og Klarna. Beløpet reserveres når du bestiller og trekkes først når varene sendes. Ved kjøp med Klarna gjelder i tillegg Klarnas egne vilkår.',
          ],
        },
        {
          h: '5. Levering',
          p: [
            'Leveringstiden vises i kassen. Har vi ikke levert innen 30 dager etter kjøpet og ikke avtalt noe annet, kan du heve kjøpet. Risikoen for varene går over på deg når du har mottatt dem.',
          ],
        },
        {
          h: '6. Begrensede opplag (drops)',
          p: [
            'Ved slipp av begrensede opplag kan det gjelde et maksimalt antall per kunde. Varer er ikke reservert før betalingen er godkjent; vi holder varene i inntil 20–35 minutter mens du betaler.',
          ],
        },
        {
          h: '7. Angrerett',
          p: [
            'Du har 14 dagers angrerett fra den dagen du mottar varene, og vi gir deg i tillegg 30 dagers åpent kjøp. Se «Retur og angrerett» for fremgangsmåte og angrerettskjema.',
          ],
        },
        {
          h: '8. Reklamasjon',
          p: [
            'Har varen en mangel, kan du reklamere innen rimelig tid etter at du oppdaget den, og senest to år etter at du mottok varen. Du kan kreve retting, omlevering, prisavslag eller heving, og eventuelt erstatning. Kontakt oss på e-post.',
          ],
        },
        {
          h: '9. Personopplysninger',
          p: [
            'Vi behandler personopplysninger for å gjennomføre kjøpet og oppfylle lovpålagte plikter. Se personvernerklæringen.',
          ],
        },
        {
          h: '10. Konfliktløsning',
          p: [
            'Klager rettes først til oss. Finner vi ikke en løsning, kan du kontakte Forbrukertilsynet for mekling, og saken kan bringes inn for Forbrukerklageutvalget. Avtalen reguleres av norsk rett.',
          ],
        },
      ],
    },
    returns: {
      title: 'Retur og angrerett',
      intro:
        'Du har 14 dagers angrerett etter angrerettloven. I tillegg gir vi deg 30 dagers åpent kjøp regnet fra dagen du mottok varene.',
      sections: [
        {
          h: 'Slik bruker du angreretten',
          p: [
            `Gi oss beskjed innen fristen, enten med skjemaet nedenfor eller med en tydelig melding til ${brand.email}. Send deretter varene til oss senest 14 dager etter at du ga beskjed.`,
            'Fristen er overholdt hvis du sender meldingen før den går ut.',
          ],
        },
        {
          h: 'Tilbakebetaling',
          p: [
            'Vi betaler tilbake det du har betalt, inkludert vanlig frakt til deg, senest 14 dager etter at vi fikk beskjed. Vi kan vente med tilbakebetalingen til vi har mottatt varene eller du har vist at de er sendt. Pengene tilbakeføres til samme betalingsmiddel.',
          ],
        },
        {
          h: 'Returfrakt og varens stand',
          p: [
            'Du dekker de direkte kostnadene ved å returnere varene, med mindre noe annet er avtalt. Du kan prøve varene for å bedømme dem, men står ansvarlig for verdiforringelse som skyldes mer håndtering enn nødvendig.',
          ],
        },
        {
          h: 'Unntak',
          p: [
            'Angreretten gjelder ikke forseglede varer som av helse- eller hygienegrunner ikke egner seg for retur dersom forseglingen er brutt. Vi opplyser tydelig på varen hvis dette gjelder.',
          ],
        },
        {
          h: 'Angrerettskjema',
          p: [
            `Til ${seller}, ${brand.email}:`,
            'Jeg/vi underretter herved om at jeg/vi ønsker å gå fra min/vår avtale om kjøp av følgende varer: ____',
            'Bestilt den / mottatt den: ____ · Ordrenummer: ____',
            'Forbrukerens navn og adresse: ____',
            'Dato og underskrift (kun hvis skjemaet sendes på papir): ____',
          ],
        },
        {
          h: 'Reklamasjon',
          p: [
            'Angreretten kommer i tillegg til reklamasjonsretten. Har varen en feil, se kjøpsvilkårenes punkt om reklamasjon.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Personvern',
      intro: `${brand.legalName} er behandlingsansvarlig for personopplysningene som behandles når du handler hos oss eller bruker nettsiden. Kontakt: ${brand.email}.`,
      sections: [
        {
          h: 'Hva vi behandler og hvorfor',
          p: [
            'Bestilling: navn, adresse, e-post, telefon, kjøpshistorikk. Grunnlag: avtale (GDPR art. 6 nr. 1 b).',
            'Regnskap: ordre- og betalingsdata. Grunnlag: rettslig plikt etter bokføringsloven (art. 6 nr. 1 c).',
            'Konto, ønskeliste og anmeldelser: grunnlag avtale. Nyhetsbrev og venteliste: grunnlag samtykke (art. 6 nr. 1 a), som du kan trekke tilbake når som helst.',
            'Feilsøking og sikkerhet: tekniske logger, berettiget interesse (art. 6 nr. 1 f).',
          ],
        },
        {
          h: 'Lagringstid',
          p: [
            'Ordredata lagres så lenge bokføringsloven krever, normalt fem år etter regnskapsårets slutt. Handlekurver uten kjøp slettes etter 60 dager. Ventelister slettes når slippet er over. Kontoen din slettes når du ber om det.',
          ],
        },
        {
          h: 'Databehandlere',
          p: [
            'Vi bruker leverandører som behandler opplysninger på våre vegne under databehandleravtale: Supabase (database og innlogging), Vercel (drift), Stripe og Klarna (betaling), Vipps MobilePay (betaling), Resend (e-post), Posten/Bring (frakt) og Sentry (feilovervåking).',
            'Der opplysninger overføres ut av EØS, skjer det med EUs standardavtaler eller EU–USA Data Privacy Framework.',
          ],
        },
        {
          h: 'Dine rettigheter',
          p: [
            'Du har rett til innsyn, retting, sletting, begrensning, dataportabilitet og til å protestere mot behandling. Kontakt oss på e-post, så svarer vi innen 30 dager.',
            'Du kan klage til Datatilsynet (datatilsynet.no).',
          ],
        },
      ],
    },
    cookies: {
      title: 'Informasjonskapsler',
      intro:
        'Vi bruker bare informasjonskapsler som er nødvendige for at butikken skal virke. Analyse er informasjonskapselfri. Vi ber om samtykke før vi eventuelt tar i bruk noe annet.',
      sections: [
        {
          h: 'Nødvendige',
          p: [
            'hyal_cart: identifiserer handlekurven din. 60 dager.',
            'hyal_cart_n: antall varer i kurven, vist i toppen. 60 dager.',
            'sb-*: holder deg innlogget når du har en konto. Varer til du logger ut.',
          ],
        },
        {
          h: 'Analyse',
          p: [
            'Vercel Web Analytics teller sidevisninger uten informasjonskapsler og uten å identifisere deg.',
          ],
        },
        {
          h: 'Betaling',
          p: [
            'Når du sendes videre til Vipps MobilePay, Stripe eller Klarna, gjelder deres informasjonskapsler og personvernerklæringer.',
          ],
        },
      ],
    },
  },
  en: {
    terms: {
      title: 'Terms of sale',
      intro: `These terms apply to sales of goods from ${brand.name} to consumers. Norwegian consumer law (the Consumer Purchases Act, the Cancellation Act, the Contracts Act and the E-commerce Act) also applies and gives you rights these terms cannot limit.`,
      sections: [
        {
          h: '1. Parties',
          p: [
            `The seller is ${seller}, ${brand.email}. The buyer is the consumer placing the order.`,
          ],
        },
        {
          h: '2. The agreement',
          p: [
            'The agreement is binding once we confirm the order by email. Obvious errors in price or description do not bind us; we will tell you as soon as possible.',
          ],
        },
        {
          h: '3. Prices',
          p: [
            'All prices are in Norwegian kroner and include 25% VAT. Shipping is shown before you pay. For delivery to Svalbard or outside Norway, Norwegian VAT is removed; any duties and import VAT in the destination country are paid by the buyer.',
          ],
        },
        {
          h: '4. Payment',
          p: [
            'We accept Vipps MobilePay, cards and Klarna. The amount is reserved when you order and only charged when the goods ship. Klarna purchases are also subject to Klarna’s terms.',
          ],
        },
        {
          h: '5. Delivery',
          p: [
            'Delivery times are shown at checkout. If we have not delivered within 30 days and nothing else was agreed, you may cancel the purchase. Risk passes to you when you receive the goods.',
          ],
        },
        {
          h: '6. Limited runs (drops)',
          p: [
            'Limited drops may have a maximum per customer. Goods are not reserved until payment is approved; we hold them for 20–35 minutes while you pay.',
          ],
        },
        {
          h: '7. Right of withdrawal',
          p: [
            'You have a 14-day right of withdrawal from the day you receive the goods, and we also give you 30 days of open purchase. See “Returns and withdrawal” for how, and for the withdrawal form.',
          ],
        },
        {
          h: '8. Complaints about defects',
          p: [
            'If an item is defective, you may complain within a reasonable time after discovering it, and no later than two years after receiving it. You may claim repair, replacement, a price reduction or cancellation, and possibly compensation. Email us.',
          ],
        },
        {
          h: '9. Personal data',
          p: [
            'We process personal data to complete your purchase and meet legal obligations. See the privacy policy.',
          ],
        },
        {
          h: '10. Disputes',
          p: [
            'Please contact us first. If we cannot agree, you can ask the Norwegian Consumer Authority (Forbrukertilsynet) to mediate, and the case can be brought before the Consumer Disputes Commission. Norwegian law applies.',
          ],
        },
      ],
    },
    returns: {
      title: 'Returns and withdrawal',
      intro:
        'You have a 14-day right of withdrawal under the Norwegian Cancellation Act. On top of that we give you 30 days of open purchase, counted from the day you receive the goods.',
      sections: [
        {
          h: 'How to withdraw',
          p: [
            `Tell us before the deadline, using the form below or a clear message to ${brand.email}. Then send the goods to us no later than 14 days after you told us.`,
            'The deadline is met if you send your message before it expires.',
          ],
        },
        {
          h: 'Refunds',
          p: [
            'We refund what you paid, including standard delivery to you, no later than 14 days after we hear from you. We may wait until we have received the goods or you have shown they were sent. Money goes back to the same payment method.',
          ],
        },
        {
          h: 'Return shipping and condition',
          p: [
            'You cover the direct cost of returning the goods unless otherwise agreed. You may try the goods to judge them, but you are liable for loss of value caused by handling beyond what is necessary.',
          ],
        },
        {
          h: 'Exceptions',
          p: [
            'The right of withdrawal does not apply to sealed goods unsuitable for return for health or hygiene reasons once the seal is broken. We say so clearly on the product if this applies.',
          ],
        },
        {
          h: 'Withdrawal form',
          p: [
            `To ${seller}, ${brand.email}:`,
            'I/We hereby give notice that I/we withdraw from my/our contract for the sale of the following goods: ____',
            'Ordered on / received on: ____ · Order number: ____',
            'Name and address of consumer(s): ____',
            'Date and signature (only if this form is sent on paper): ____',
          ],
        },
        {
          h: 'Defects',
          p: [
            'The right of withdrawal comes in addition to your right to complain about defects. See the terms of sale.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacy',
      intro: `${brand.legalName} is the controller for personal data processed when you shop with us or use this website. Contact: ${brand.email}.`,
      sections: [
        {
          h: 'What we process and why',
          p: [
            'Orders: name, address, email, phone, purchase history. Basis: contract (GDPR Art. 6(1)(b)).',
            'Accounting: order and payment data. Basis: legal obligation under the Bookkeeping Act (Art. 6(1)(c)).',
            'Account, wishlist and reviews: basis contract. Newsletter and waitlists: basis consent (Art. 6(1)(a)), which you can withdraw at any time.',
            'Troubleshooting and security: technical logs, legitimate interest (Art. 6(1)(f)).',
          ],
        },
        {
          h: 'Retention',
          p: [
            'Order data is kept as long as the Bookkeeping Act requires, normally five years after the end of the financial year. Carts without a purchase are deleted after 60 days. Waitlists are deleted when the drop is over. Your account is deleted when you ask.',
          ],
        },
        {
          h: 'Processors',
          p: [
            'We use vendors that process data on our behalf under data processing agreements: Supabase (database and sign-in), Vercel (hosting), Stripe and Klarna (payments), Vipps MobilePay (payments), Resend (email), Posten/Bring (shipping) and Sentry (error monitoring).',
            'Where data leaves the EEA, transfers rely on the EU Standard Contractual Clauses or the EU–US Data Privacy Framework.',
          ],
        },
        {
          h: 'Your rights',
          p: [
            'You have the right to access, rectification, erasure, restriction, data portability and to object. Email us and we will reply within 30 days.',
            'You can complain to the Norwegian Data Protection Authority (Datatilsynet).',
          ],
        },
      ],
    },
    cookies: {
      title: 'Cookies',
      intro:
        'We only use cookies the shop needs to work. Analytics are cookieless. We will ask for consent before using anything else.',
      sections: [
        {
          h: 'Necessary',
          p: [
            'hyal_cart: identifies your cart. 60 days.',
            'hyal_cart_n: number of items in the cart, shown in the header. 60 days.',
            'sb-*: keeps you signed in when you have an account. Until you sign out.',
          ],
        },
        {
          h: 'Analytics',
          p: [
            'Vercel Web Analytics counts page views without cookies and without identifying you.',
          ],
        },
        {
          h: 'Payments',
          p: [
            'When you are sent on to Vipps MobilePay, Stripe or Klarna, their cookies and privacy policies apply.',
          ],
        },
      ],
    },
  },
}
