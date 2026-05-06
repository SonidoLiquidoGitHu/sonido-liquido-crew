/**
 * Script to update artist bios and press kit data
 * Run: cd sonido-liquido-crew && export DATABASE_URL="..." && export DATABASE_AUTH_TOKEN="..." && npx tsx scripts/update-artists-bios.ts
 */

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

interface ArtistUpdate {
  slug: string;
  bio: string;
  shortBio: string;
  pressQuotes?: { quote: string; source: string; sourceUrl: string }[];
  featuredVideos?: { videoUrl: string; title: string; platform: string; views: number; thumbnailUrl: string }[];
}

const artistUpdates: ArtistUpdate[] = [
  // ===============================================
  // BRUNO GRASSO
  // ===============================================
  {
    slug: "bruno-grasso",
    shortBio: "Rapero originario de Azcapotzalco, CDMX. Conocido por su estilo influenciado por la mafia italoamericana y su ética de trabajo impecable.",
    bio: `Hazel Luna t.c.c. Bruno Grasso es un rapero originario de la alcaldía Azcapotzalco en la Ciudad de México. La primera vez que pudimos escucharlo fue en Los raps entre los dientes, el octavo track de Flow de Lujo (2017), un disco en el que Led Serrano t.c.c. Zaque se propuso unir beats más agresivos con buenos rapeos. Es interesante que el líder de Sonido Líquido eligiera trabajar con un MC que hasta ese momento era desconocido. Pero conforme escuchamos sus rimas, las cosas se aclaran: "Soy Bruno Grasso/novato promesa/ mido 1.90 de los pies a la cabeza/ peso 130 kilos pa, de rimas gruesas". Esto marcaría el principio de una fructífera colaboración entre el fundador de Sonido Líquido Crew y uno de sus más promisorios reclutas: Bruno Grasso, quien ingresó a SLC en 2017.

Zaque también mezcló y masterizó el primer maxi sencillo que Grasso lanzó, titulado 2 gramos (2018) que contó con la colaboración de Kev Cabrone. Luego Led produjo los beats, mezcló y masterizó De la noche y sus efectos (2018), la ópera prima de Grasso en la que logró encontrar su propia voz.

El primer acercamiento que Hazel tuvo con el hip hop y el rap ocurrió durante su adolescencia, ya que a los doce años descubrió a través del top de MTV a 50 Cent y Eminem. Posteriormente escuchó algunos tracks de rap en español como por ejemplo Cartel de Santa, no obstante, aún no tenía un entendimiento claro de lo que era hip hop. Pero todo estaba por cambiar y la respuesta se encontraba en el lugar menos esperado: la casa de su abuela, ya que su tío Fancy Freak vivía ahí.

En el álbum De la noche y sus efectos logró ir un paso adelante y cristalizar su voz como rapero, desarrollando un estilo propio en el que reluce su pasión por los trabajos de ficción relacionados con la mafia italoamericana. "Para mí las cosas más importantes que me formaron ocurrían de noche. Sonido Líquido ensayaba de noche, las fiestas también ocurrían de noche y de ahí surgió la idea para el título, porque de noche aprendí cosas de la vida y el hip hop y sus efectos, son lo que yo soy ahora".

Bruno se ha tomado esto como un aliciente, ha colaborado con Doctor Destino en De patios vacíos y corazones rotos (2020), con No siempre. Ha lanzado Médium (2020) y Tumbao (2022). Grasso continúa caracterizándose por buscar rapear cada vez mejor, seguir buscando rimas que sorprendan y maneras cada vez más naturales de decirlas. "Hip hop es mi pasión. Si no lo hago, tiendo a ver la vida más negra y andar de mal humor. Hip hop ha influenciado todo, mi vida, mi forma de ser y mis decisiones".

Escrita por: Edmeé García t.c.c. Diosaloca MX`,
    pressQuotes: [
      {
        quote: "Cada vez que trabajamos ha sido satisfactorio porque entiende lo que pides de él y da todo su esfuerzo. Da gusto trabajar con él porque sé que lo que me esfuerce en mi trabajo va a ser correspondido por un esfuerzo equivalente.",
        source: "Zaque para Sonido Líquido",
        sourceUrl: "https://sonidoliquido.com"
      }
    ]
  },

  // ===============================================
  // BREZ
  // ===============================================
  {
    slug: "brez",
    shortBio: "MC, productor y beatmaker de Coacalco, Estado de México. Su obra se caracteriza por un hip hop introspectivo, espiritual y cósmico con estética minimalista.",
    bio: `Brez es un MC, productor y beatmaker originario de Coacalco, Estado de México, miembro del crew Sonido Líquido y fundador del sello Summer Madness. Su obra se caracteriza por un hip hop introspectivo y espiritual, a menudo cósmico, acompañado de una estética minimalista y elegante. Desde sus primeros pasos en la producción instrumental, ha desarrollado un estilo que combina profundidad lírica con precisión sonora.

Trayectoria y discografía:
• Umbral (2018): Publicado bajo el sello Summer Madness, del cual Brez fue miembro fundador. Este álbum marcó un punto de inflexión en su carrera, cristalizando su visión artística y espiritual.
• Impresiones del Cosmos (2020): Un LP de 14 canciones que explora la dimensión cósmica del hip hop, con títulos como Sonido Supermasivo y El universo está escuchando.
• Sonido de Lujo (2022): Álbum colaborativo junto a Zaque, fundador de Sonido Líquido. Con 12 canciones, este proyecto reafirmó la constancia artística de Brez y su integración plena en el colectivo.
• Astra Espíritu (2024): Proyecto colaborativo con Reick Uno, publicado bajo el sello Sonido Líquido. Con 19 tracks, fusiona la voz y producción de Brez con la técnica del DJ, ofreciendo un rap fresco y espiritual.
• Templo: Una vida en capítulos: Su obra más reciente, concebida como un diario sonoro dividido en capítulos, donde Brez entrelaza filosofía espiritual y narrativa autobiográfica.

Beat Tapes en Cultura Records (Europa):
• Mantrala: Beats meditativos y minimalistas, concebidos como mantras sonoros que invitan a la contemplación.
• Índigo: Una tape con un toque retrofuturista estilo 80s, que combina texturas espirituales y atmosféricas con un pulso nostálgico y visionario.

Como productor, Brez se nutre de referentes que van desde J Dilla y Pete Rock hasta Boards of Canada y Gigi Masin, lo que le permite fusionar tradición hip hop con exploraciones electrónicas y ambientales.

Dentro de la escena del hip hop mexicano, Brez se ha consolidado por su originalidad y su capacidad de transformar la vulnerabilidad en arte. Su estética minimalista, inspirada en templos japoneses y colores simbólicos (dorado, púrpura, verde), refuerza la espiritualidad de su propuesta.

Cada proyecto de Brez reafirma su compromiso con la autenticidad y la transformación personal. Su música funciona como un puente entre lo íntimo y lo trascendente, posicionándolo como una voz singular dentro del rap mexicano contemporáneo.`,
    pressQuotes: [
      {
        quote: "Impresiones del Cosmos es un disco que emerge de una distorsión espacio temporal en sonido estéreo, denotando no sólo el aumento de su pericia en la producción, también rapeos que contienen un desarrollo tanto conceptual como sonoro.",
        source: "Diosaloca MX",
        sourceUrl: "https://diosalocamx.com/escucha-impresiones-del-cosmos-de-brez-un-lp-interestelar-de-hip-hop-en-espanol/"
      },
      {
        quote: "Hacer beats para mí significa manipular el tiempo y el espacio.",
        source: "Brez para Diosaloca MX",
        sourceUrl: "https://diosalocamx.com/escucha-impresiones-del-cosmos-de-brez-un-lp-interestelar-de-hip-hop-en-espanol/"
      }
    ]
  },

  // ===============================================
  // CHAS 7P
  // ===============================================
  {
    slug: "chas-7p",
    shortBio: "DJ tornamesista originario de CDMX. Conocido como el tornamesista más técnico del país, ganador de Skills 2015 y 2016, y cuarto lugar en DMC Online 2016.",
    bio: `Erick Daniel Mendoza Martinez t.c.c. Chas7P es un DJ tornamesista originario de la Ciudad de México. Es conocido como el tornamesista más técnico del país y estar a la vanguardia de su disciplina lo ha colocado en el ranking de los tres mejores de México. Ganó las competencias Skills 2015 y 2016 y obtuvo el cuarto lugar en la DMC Online 2016. Actualmente forma parte de Sonido Líquido Crew y aún tiene muchas ideas por plasmar y desarrollar a través de sus tornamesas.

Su viaje de exploración del hip hop comenzó de manera fortuita cuando estaba en sexto de primaria. De acuerdo con Chas7p: "Me castigaron dejándome sin recreo con un amigo del salón. Mi amigo movió todas las bancas, se paró de cabeza y giró. En esa época yo creía que el DJ hacía la música como los beatmakers y empecé a hacer break dance sin saber mucho de ello. Hubo un DJ que me atrajo mucho, era DJ Shadow y tenía un MPC. Eso fue más o menos en el año 2000".

Sus ganas de aprender más lo llevaron a querer convertirse en DJ y en pos de esa meta, ingresó a la escuela G Martell. Ahí conoció a T Capital, un tornamesista que le enseñó sobre el TTM que es un método de transcripción del tornamesismo y consiste en anotar la rítmica del scratching sobre un pentagrama.

Chas7p es un conocedor de su disciplina, que no sólo ha logrado el dominio técnico del tornamesismo, sino que sabe explicar de manera ordenada y metódica diferentes aspectos de lo que es ser un DJ. "Hay cinco tipos de DJ en hip hop. El primero es el DJ party rocker que hace fiestas. El segundo es un DJ productor como lo eran DJ Premier o DJ Shadow. El tercer tipo es el DJ selector o DJ selektah. El cuarto tipo es el DJ tornamesista que se especializa en explorar lo que se puede hacer rítmicamente con las tornamesas. El quinto tipo es el DJ de batalla. Yo recaigo en el cuarto y el quinto tipo".

Su proceso de preparación para Skills fue intenso: "Era encerrarme en mi burbuja durante doce, trece o catorce horas al día. Comía, dormía y entrenaba." Hay una técnica que se llama chasing y fue el primer mexicano que la hizo. En 2016 se enfrentó a su mentor T Capital y ganó, a la icónica edad de 27 años, creando revuelo pues T Capital era conocido por ser mundialista mexicano en DMC World 2005.

Fue en dicha competencia que conoció a Sonido Líquido Crew a través de Fancy Freak. Posteriormente fue invitado a participar en Ven a probar qué tan heavy del álbum Flow de lujo (2017). En 2020 durante la pandemia se unió oficialmente a SLC.

Actualmente trabaja con Brez en proyectos conjuntos. Su técnica y precisión son impecables y a través de su compromiso con los tracks en los que participa, no sólo agrega scratches para adornar, le gusta participar y proponer para añadir su toque personal.

Escrita por Edmeé García t.c.c. Diosaloca Mx`,
    pressQuotes: [
      {
        quote: "Su técnica y precisión son impecables y a través de nuestras pláticas pude notar su compromiso con los tracks en los que participa. No sólo agrega scratches para adornar, le gusta participar y proponer para añadir su toque personal.",
        source: "Brez para Sonido Líquido",
        sourceUrl: "https://sonidoliquido.com"
      }
    ]
  },

  // ===============================================
  // CODAK
  // ===============================================
  {
    slug: "codak",
    shortBio: "Rapero originario de CDMX. Miembro fundador de Sonido Líquido Crew y hermano putativo de Zaque. El anciano oculto del crew.",
    bio: `Rudiger DeRuder t.c.c. Codak t.c.c. El Gordo es un rapero originario de la Ciudad de México. Miembro de Sonido Líquido Crew desde sus orígenes y hermano putativo de Led Serrano t.c.c. Zaque t.c.c. Pedro Pe, fundador de SLC. "Conocí a Led desde que tengo tres años pues compartíamos gustos. Desde entonces éramos como outcasts en la escuela y eso nos unía un poquito más. Desde entonces éramos crew, éramos amigos".

Codak ha tenido una colaboración en cada producción de Zaque, desde El día y la noche en el infierno (2006), pasando por Flow de lujo (2017) e Intimidación (2020). La única excepción ha sido Mujerez (2014) y recientemente Codak ha presentado al mundo junto con Zaque su ópera prima titulada Crónicas de un agarraculos (2021).

Si Zaque es el anciano en la montaña, entonces Codak es el anciano oculto pues sus intervenciones han sido cruciales para el surgimiento y desarrollo de lo que ahora conocemos como SLC. Podríamos decir que Sonido Líquido Crew germinó de una semilla que vino empacada en una de sus maletas desde Alemania. "De sexto de primaria a primero de secundaria me fui un año a Alemania y en la casa en la que me quedaba, había un vato de dieciocho o veinte años que le gustaba la música. Tenía mil compactos de música electrónica y como veinte de hip hop. El primero que me encantó fue el 36 Chambers de Wu-Tang Clan. Todos esos discos me los regaló y los traje a Mexico".

El resto es historia, pues a la edad de dieciséis años, Rudiger se hizo de algunos fondos y "Lo único que me interesaba era hip hop. Así que fuimos Led y yo corriendo al centro a comprar equipo sin saber bien qué era lo que estábamos comprando. Eran nuestras ganas de escuchar otra cosa, de no comernos lo que nos daba la televisión. En ese entonces no había internet, ni smartphones".

En cuanto a su proceso creativo: "Amanezco un día súper rapero y vomito una canción. Es algo incidental, si quiero sentarme a escribir algo no sale nada. Es un ratito. No soy de esas personas que se sientan cinco horas a escribir. Lo hago una hora a lo mucho. Puro sprint".

Crónicas de un agarraculos (2021) incluye el ya conocido humor negro que el Gordo inyecta a su lírica, además de una serie de skits que desarrollan la historia de un personaje que emergió en la mente adolescente de Rudiger. Actualmente radica en Ibiza desde 2014 donde se dedica a la jardinería. Para Codak "Hip hop es sabiduría, es como leer libros. Es como tener pláticas con otros adultos, tú como un niño al que le están dejando entender lo que ellos saben. De alguna forma es absorber un legado, pero sólo las personas que hablan el idioma lo van a entender".

Escrita por Edmeé García t.c.c. Diosaloca Mx`,
    pressQuotes: [
      {
        quote: "Si Led no se lo tomara tan, pero tan en serio, creo que yo no me lo tomaría tan en serio. Es decir, hubiera podido ser un fan de hip hop de toda la vida, pero no me hubiera puesto a hacer canciones.",
        source: "Codak para Sonido Líquido",
        sourceUrl: "https://sonidoliquido.com"
      }
    ]
  },

  // ===============================================
  // DILEMA
  // ===============================================
  {
    slug: "dilema",
    shortBio: "MC originaria de Zacatecas. Conocida como 'La Blanca del Game', 'El Néctar del Néctar' y 'LaBig Mmama'. Trayectoria sólida en batallas escritas y estudio.",
    bio: `Ilse Denisse Villegas Haro t.c.c Dilema es una MC originaria de Zacatecas, Zacatecas, criada en Bellavista, en el barrio de los 5 Señores, territorio que marcó su carácter, su temple y la visión con la que ha construido su camino dentro del hip hop. A lo largo de su trayectoria ha transitado por distintas etapas creativas: "Colmillos Burdos" en sus inicios, "La Blanca del Game", "El Néctar del Néctar" al integrarse a una nueva etapa de trabajo en 2024, y actualmente también conocida como "LaBig Mmama". Cada alias representa una versión distinta de sí misma: evolución, madurez y reafirmación de identidad.

Su vínculo con la música comenzó en casa. Su padre formaba parte de una banda de covers llamada "Grupo Ginebra", donde tocaba la batería y cantaba simultáneamente. A los 14 años tuvo su primer acercamiento formal al micrófono cuando interpretó dos canciones junto a la agrupación, una de ellas a dueto con su padre. Ese momento fue decisivo: entendió el peso de la música y la sensación de conexión que nace frente a un público.

Su entrada al hip hop llegó primero a través del graffiti. En 2008, con apenas 15 años, comenzó firmando como "Dilema", nombre inspirado en la canción Nelly ft. Kelly Rowland - Dilemma. En 2009 dio el paso hacia el rap motivada por su primo, quien contaba con un estudio casero. Descubrió que escribir rimas le resultaba natural, casi instintivo.

Sus primeras referencias en el rap fueron mujeres que rompían moldes: Missy Elliott, Chyna Whyte, Gangsta Boo, Lil Mama, Lil Kim, además de artistas en español como Sheila Bueno a.k.a. Syla, Ariana Puello, Neblinna, Mestiza Hispana, Livera Insomne y Rapseria.

Su primer álbum independiente "El Dilema" (2021) marcó un parteaguas en su carrera. Paralelamente, incursionó en el circuito de batallas escritas desde 2016, compitiendo en eventos en Tijuana y Ciudad de México.

En 2023, durante la grabación del videoclip de uno de sus temas, consolidó el acercamiento con el productor Zaque. Se integró de manera activa a Sonido Líquido Crew, alianza que se oficializó en noviembre de 2024 con el lanzamiento del EP "Rapiña" (2024). Ha participado en múltiples proyectos: "El Nuevo La Joya de la City" (2023), "Carne Cruda" (2024), "Rapiña" (2024), y "Vómito Verbal" (2025).

Para Ilse, el hip hop no es únicamente música: es una filosofía de vida. Es la forma en que habla, piensa, se viste y se enfrenta al mundo. Es disciplina, conciencia y aprendizaje permanente. "Después de mis hijas, el hip hop es el eje central de mi existencia. Si tuviera que definirlo en una sola palabra, elegiría: fuerza."`,
    pressQuotes: [
      {
        quote: "El hip hop no admite debilidad: entras frágil y te haces fuerte. Es energía, argumentos sólidos, mente firme y evolución constante.",
        source: "Dilema para Sonido Líquido",
        sourceUrl: "https://sonidoliquido.com"
      }
    ]
  },

  // ===============================================
  // DOCTOR DESTINO
  // ===============================================
  {
    slug: "doctor-destino",
    shortBio: "Productor, beatmaker y rapero mexicano. Uno de los alquimistas del hip hop mexicano, miembro de Sonido Líquido Crew desde 2006.",
    bio: `Si Sonido Líquido Crew es un ágora del hip hop mexicano, entonces Doctor Destino es uno de sus mejores alquimistas. Doctor Destino t.c.c. Rodrigo Tovar es un productor, beatmaker y rapero mexicano, que pese a buscar la ecuanimidad, es un apasionado de lo que hace y un poco compulsivo. "Soy una persona que se puede volver adicta a cualquier cosa, si algo me gusta no paro de hacerlo". También es alguien que tiende más a la reclusión que la exposición y es por eso que ha permanecido como uno de los secretos mejor guardados del hip hop en México, al menos hasta ahora.

Pese a preferir mantenerse lejos de los reflectores, ha sido parte de SLC desde 2006 y estuvo a cargo de la mezcla, la masterización y los beats de Aquí somos lo que hacemos (2010) de Tino el Pingüino. También ha sido generoso con sus beats con Nayasuza y Bruno Grasso. Es posible que hayas escuchado su colaboración en Flow de lujo (2017). Y también puedes escuchar a Zaque en varios tracks de la discografía de Doctor Destino. Puede ser que lo conozcas por DNA, un proyecto que realizó junto con Alonnso.

Se dice que infancia es destino y esto ciertamente podría aplicarse a Tovar, ya que pese a llevar muchos años confeccionando tracks, fue en su infancia que tuvo su primer contacto con el hip hop. "Lo primero que recuerdo de hip hop es un video de Run DMC que vi en MTV cuando estaba en quinto de primaria y me gustó. En mi escuela sólo escuchaban la radio comercial y nunca me identifiqué con eso". El detonador definitivo fue la escucha de un LP de ToteKing & Shotta titulado Tu madre es una foca. "Tenía un amigo, Alfredo Genel, conocido como A.A.G.G. Demente. En ese tiempo nos juntábamos en su casa, fumábamos, rapeábamos y así seguíamos hasta el infinito".

Tres años después conoció a Led Serrano, t.c.c. Zaque. "Un día fui a casa de Led, que ya tenía tarjetas de sonido y monitores. Ahí empecé a aprender un buen, conocí Reason y lo sigo utilizando hasta la fecha".

Discografía: Sin retorno al principio vol. 1 (2009), Luz y calles (2010) de DNA, 23 (2012), Uno doble (2012) de DNA, El frío de la primavera (2018), De patios vacíos y corazones rotos (2020), B(u)da (2021), Gospel (2022), Oasis (2022), Nocturno (2023), Euterpe (2023), Cuando Miras al Abismo (2024) y Nudos (2026).

Sus discos no carecen de groove, pero son menos agresivos, las progresiones armónicas están más cuidadas, sus tracks se sienten más nítidos y espaciosos. Sus rimas van con fluidez de lo trascendental a lo prosaico y han ganado la sensibilidad sincera que sólo se obtiene al dejar atrás las pretensiones.

Escrita por: Edmeé García t.c.c. Diosaloca MX`,
    pressQuotes: [
      {
        quote: "Doctor Destino produce hip hop con maestría. Cada álbum nuevo es simultáneamente una extensión y una transformación del anterior.",
        source: "Diosaloca MX",
        sourceUrl: "https://diosalocamx.com/el-frio-de-la-primavera-de-doctor-destino/"
      },
      {
        quote: "Doctor Destino puede ir de lo prosaico a lo profundo, de lo banal a lo trascendente sin necesidad de engrandecerse a través de la promoción del propio ego.",
        source: "Diosaloca MX",
        sourceUrl: "https://diosalocamx.com/el-frio-de-la-primavera-de-doctor-destino/"
      },
      {
        quote: "Nos encontramos en una de las etapas más creativas de Doctinho... su genio no para.",
        source: "Entre Beats y Barras",
        sourceUrl: "https://entrebeatsybarras.wordpress.com/2022/10/01/doctor-destino-oasis-nuevo-album-2022-hip-hop-mexicano/"
      }
    ]
  },

  // ===============================================
  // FANCY FREAK
  // ===============================================
  {
    slug: "fancy-freak",
    shortBio: "DJ de hip hop originario de CDMX. Uno de los pilares más antiguos e importantes de Sonido Líquido Crew, testigo y partícipe del desarrollo del género en México.",
    bio: `Ernesto Díaz t.c.c. DJ Freak, t.c.c. Fancy Freak es un DJ de hip hop originario de la Ciudad de México que ha sido testigo y partícipe del desarrollo del género en el país. Es uno de los pilares más antiguos e importantes de Sonido Líquido Crew. Si tienes la fortuna de conseguir un espacio en su agenda, puede pasar horas contándote historias del hip hop.

"He ido creciendo como persona, como un participante de la cultura de hip hop. Empecé como todos con mucho entusiasmo, alegría, felicidad y ganas. Me he tropezado con muchos obstáculos, pero lejos de desistir, me han ayudado a aprender más. Yo me ubico del lado de los DJ's, aunque a veces me han puesto en el lugar de un tornamesista. Me gusta crear para que la gente se mueva y escuche la música hasta que no pueda más. Me interesa más desarrollar el aspecto de la curaduría musical y la mezcla."

El primer encuentro de Ernesto Díaz con hip hop ocurrió a mediados de la década de los años ochenta. "Tenía un amigo cuyo hermano se había ido de mojado al gringo y trajo una videocasetera de fayuca y videos en ese formato que tenían batallas de b-boys. Me invitó a su casa a verlos. En esos videos había un cuate con unas tornamesas en las jugaba con dos discos iguales, lo ponían en una, luego en la otra y eso llamó mi atención. Entonces pensé: ¡esto tengo que aprenderlo!"

En 1989 se asoció con un amigo para comprar tornamesas y un mixer. En esa época no había tutoriales en internet así que lo hicieron por prueba y error. Antes de llamarse DJ Freak, Ernesto se hacía llamar DJ Sour, nombre que emergió de la cultura del acid house en México. Solía tocar house junto con su amigo DJ TB303.

De 2000 a 2002 organizó anualmente eventos de hip hop con batallas entre crews de b-boys. En esos eventos conoció a Justiniani y Mr. 11, quienes lo invitaron a colaborar en un disco. Así se conformó Contraflujo y su primer álbum Primera Fase. Posteriormente Justiniani le presentó a Led Serrano t.c.c. Zaque. En 2003 el Peón y Zaque graban 1:55 AM, en el que Freak colabora con el tornamesismo.

De acuerdo con Zaque: "Sin Freak no seríamos un crew serio. Antes de que tuviéramos varios DJ's y existiese Lado B, sólo era Freak". Él era el encargado de hacer sonar todos los sets de los MC's del crew y quien añadía un aderezo especial con el scratching a los tracks.

Desde 2016 ha sacado El primer trago, El segundo trago, Al calor de la noche 1 y 2, Mix Gourmet Vol. 1, Mix Gourmet Vol. 1 Live y De paseo por los breaks. Definitivamente Fancy Freak aún tiene mucha energía para comandar y convocar a los adeptos al hip hop a bailar al ritmo de unos breaks finamente seleccionados.

Escrita por: Edmeé García t.c.c. Diosaloca Mx`,
    pressQuotes: [
      {
        quote: "Sin Freak no seríamos un crew serio. Antes de que tuviéramos varios DJ's y existiese Lado B, sólo era Freak.",
        source: "Zaque para Sonido Líquido",
        sourceUrl: "https://sonidoliquido.com"
      }
    ]
  },

  // ===============================================
  // HASSYEL
  // ===============================================
  {
    slug: "hassyel",
    shortBio: "Rapero originario de Ecatepec. Miembro de Sonido Líquido Crew con una pasión por el buen uso del lenguaje en el rap y técnicas refinadas de rapeo.",
    bio: `Hassyel Peña t.c.c. Has, t.c.c. V. Fresh, es un rapero originario de Ecatepec y miembro de Sonido Líquido Crew. Nacido en 1985, Hassyel descubrió el hip hop gracias a Naughty by Nature y su track Hip Hop Hooray. Debido a su pasión por el género, a la edad de doce años, ya iba al tianguis del Chopo a buscar discos. "Estudiaba todos los libritos, quién los hacía, quién los grababa, en qué estudio. Si tenían giras mundiales, o sesiones en Francia".

Esto lo llevó a escribir sus primeras letras de rap, que por cierto estaban en inglés, ya que todo lo que él escuchaba estaba en ese idioma. "Había escuchado a Gang Starr, a Wu Tang Clan, a Nas. Los entendía porque hablaba inglés desde la secundaria y en el CCH estudié francés". Así fue cómo nació su alter ego rapero llamado MC Vinilo.

Sin embargo, al intentar rapear en español, se dio cuenta de que era difícil calcar los flows del inglés al español. El inglés tiene más palabras monosilábicas, así que los patrones de acentuación son más variados. Este fue el inicio de su pasión por el buen uso del lenguaje en el rap y su interés por desarrollar el contenido de sus letras.

Discografía: Angelical (2002), Hip Hop, sangre, lágrimas y tinta vol.1 (2004), Vini Vidi Vici (2005), Hip Hop, sangre, lágrimas y tinta vol.2 (2007), Olivo en la cien (2008), V (2010) y Despertares (2021). Este último EP contó con Led Serrano t.c.c. Zaque en la producción y es la materialización simbólica de su integración a Sonido Líquido Crew.

"Pasé varios años de godín, estuve en muchos bancos, y dejé el hip hop. Las presiones ya eran otras." Pero un día conocí a Led. "Ya conocía su rapeo, vi que era rápido en algunos momentos específicos, y no decía tonterías incoherentes. Además, su mezcla era la mejor."

Más tarde dejó el banco y se convirtió en barbero. "Al no tener un horario fijo, estoy menos presionado y tengo mucha más libertad. Así que le dije a Led que tenía el tiempo y sobretodo que tenía ganas de rapear".

Has mantiene un rigor con respecto a los patrones de acentuación, la generación de fraseos, la búsqueda de flows y rimas interesantes y el desarrollo de sus ideas. "Haré esto por siempre se venda o no mi CD. Escribo con y por amor que es como debe de ser. Si estamos seguros y aún aquí (vivos). Let's do this! Que estoy aquí, es para ser feliz e intenso."

Escrita por: Edmeé García t.c.c. Diosaloca MX`,
    pressQuotes: [
      {
        quote: "Creo que Hassyel tiene ideas sobre cómo quiere sonar y eso nos lleva por un camino. Yo trato de acomodarme a lo que entiendo que quiere. Rapea bien desde hace tiempo y se está desarrollando de una manera distinta.",
        source: "Zaque para Sonido Líquido",
        sourceUrl: "https://sonidoliquido.com"
      }
    ]
  },

  // ===============================================
  // KEV CABRONE
  // ===============================================
  {
    slug: "kev-cabrone",
    shortBio: "Rapero y beatmaker originario del Estado de México. Su historia se entretejió con el hip hop desde temprana edad, junto a su amigo Bruno Grasso.",
    bio: `Kev Cabrone t.c.c. Kevin Delgado es un rapero y beatmaker originario del Estado de México. Su historia se entretejió con el hip hop tempranamente, tenía ocho años cuando descubrió a Redman, Snoop Dogg y Outkast a través de MTV. Al llegar a la secundaria, sus oídos estaban deseosos de escuchar rap en español y gracias a su mejor amigo Hazel Luna t.c.c. Bruno Grasso, conoció a Violadores del Verso, ToteKing, Shotta, SFDK y Mucho Muchacho.

Fue en esa época que descubrió El día y la noche en el infierno (2006) de Zaque y desde ese momento empezó a soñar con grabar de la mano de Sonido Líquido Crew. Tras tres lustros de experimentos y aprendizajes, su ilusión de unirse al crew se convirtió en realidad.

Varios años antes de que su nombre estuviese en el roster, Kevin fungió como doble de Franco Genel t.c.c. Tino el Pingüino por una breve temporada entre 2005 y 2006. "De Tino aprendí a tener mucha actitud en vivo. Me gustó como él miraba a la gente a los ojos y se les acercaba. Me gusta la idea de tratar de dominar el escenario."

Kevin también ha aprendido a diseñar beats. Estuvo a cargo de los beats del primer maxi sencillo de Bruno Grasso, titulado 2 gramos (2018). "No me gustaba la idea de rapear sobre beats que alguien ya hubiera usado, no me parecía original. Así que descargué Reason y empecé a aprender yo sólo". Con el tiempo cambió a Maschine.

Adoptó el nombre de Kev Cabrone, inspirado en el apellido Corleone y alineándose con la influencia italiana del nombre de Bruno Grasso. En 2020 logró cristalizar otro de sus sueños: presentarse al mundo con el EP Octubre 31 (2020), producido por Zaque, con participación de Doctor Destino, Reick Uno, X Santa-Ana y Fancy Freak.

"Mi acercamiento con Kevin fue a través de Grasso", dice Zaque. "Al principio sus raps eran versiones asimétricas de lo que ya había escuchado de otra gente. Pero ya estaba haciendo beats y eso es más raro. Hace como seis meses me mostró lo nuevo que había hecho y vi que había elevado su nivel tanto en rapeos como en beats."

Como muchos raperos jóvenes, Kev Cabrone opta por hablar de lo que conoce: su afición al basquetbol, su pasión por el hip hop, su entusiasmo por formar parte de SLC. "Busco llegar hasta adentro, para encontrarme, no hay más / palabras puras y honestas / saludos para mi mamá."

Escrita por: Edmeé García t.c.c. Diosaloca MX`,
    pressQuotes: [
      {
        quote: "Vi que había elevado su nivel tanto en rapeos como en beats. Se lo mostré al Doc y decidimos invitarlo a rifar. La diferencia fue que ya no eran copias asimétricas sino su propia historia sobre sus propios beats.",
        source: "Zaque para Sonido Líquido",
        sourceUrl: "https://sonidoliquido.com"
      }
    ]
  },

  // ===============================================
  // LATIN GEISHA
  // ===============================================
  {
    slug: "latin-geisha",
    shortBio: "Cantante originaria de Nezahualcóyotl. Su propuesta 'Pop Premium' redefine los límites del género con sutileza, sensualidad y una voz cautivadora.",
    bio: `Nicole Zapata, artísticamente conocida como Latin Geisha, es una cantante originaria de Nezahualcóyotl, Estado de México y forjada en la escena independiente de Querétaro cuya propuesta musical redefine los límites del género para darle un toque de sutileza, sensualidad además de una voz que te invita a seguir escuchándola en cada track.

Su idilio con la música comenzó de forma lúdica con un karaoke y discos de pop; sin embargo, su verdadera educación musical ocurrió en los ensayos de la banda de su tío en Querétaro. Allí, entre las notas del Blues, el Rock y el R&B, Nicole pasó de ser espectadora a corista, ganando la confianza necesaria para lanzarse como solista en el circuito local, eventos privados y concursos de la ciudad.

Sin estudios formales, pero con un instinto agudo por la gran variedad de géneros y artistas que ha escuchado a lo largo de su vida, artistas como Ely Guerra, Amy Winehouse, Aaliyah y Azealia Banks han caminado a su lado en este trayecto. Así fue como comenzó a crear temas propios sobre beats encontrados en SoundCloud. La filtración de un demo por WhatsApp despertó el interés de la escena Hip Hop, marcando el momento exacto en que adoptó el nombre de Latin Geisha en homenaje a un tema de la banda argentina Illya Kuryaki and The Valderramas.

Su debut en plataformas digitales comenzó con el sencillo 'Fuego' (2020), que le abrió las puertas de la industria informal, permitiéndole colaborar con sellos como Imperial Glory y productoras visuales como Memoria Cine, logrando amplificar su nombre y estética visual a nivel nacional.

Tras un periodo de búsqueda y diferencias creativas, Geisha decidió trazar un camino independiente que la llevó a unir fuerzas con el respetado colectivo Sonido Líquido Crew. Esta alianza se consolidó con el estreno de 'Póker' (2022) junto a Doctor Destino, Zaque y Reick Uno. Posteriormente gracias a este sencillo fue invitada a ser parte del crew, lo que la llevó a hacer un disco en conjunto con Zaque llamado Flavor Love (2024), además de colaborar en proyectos como Ella (2023), El regreso de Pepe Levine (2023), Letras vacías (2023), Corazón de Cristal (2023), Piel (2023), Ni hace tanto frío ni la vida es tanto (2024), entre otros.

En 2025 comienza a trabajar en un nuevo proyecto: Latin Drive-In, del que se han desprendido los sencillos Interceptor Vtr (2025) y Cavalier (2025).

Con un catálogo que ya supera las 15 canciones en solitario y múltiples colaboraciones estratégicas, Latin Geisha continúa consolidando lo que ella misma define como 'Pop Premium': una fusión de canto, presencia y calidad sonora que refresca la escena del Hip Hop mexicano bajo el respaldo de uno de los sellos más influyentes del país.`,
    pressQuotes: [
      {
        quote: "Una de las voces más sofisticadas de la escena independiente actual.",
        source: "Prensa Fan",
        sourceUrl: "https://prensafan.com/el-pop-premium-de-latin-geisha/"
      },
      {
        quote: "Bajo el concepto de 'Pop Premium', su propuesta musical es una amalgama de elegancia y exploración sonora.",
        source: "Prensa Fan",
        sourceUrl: "https://prensafan.com/el-pop-premium-de-latin-geisha/"
      },
      {
        quote: "Latin Geisha consolida una audiencia fiel que conecta con su narrativa visual y su evolución constante dentro del género pop.",
        source: "Prensa Fan",
        sourceUrl: "https://prensafan.com/el-pop-premium-de-latin-geisha/"
      }
    ]
  },

  // ===============================================
  // PEPE LEVINE
  // ===============================================
  {
    slug: "pepe-levine",
    shortBio: "Productor y beatmaker italiano-mexicano. Conocido por organizar fiestas y tardeadas en bares y discotecas. Creador del Veraneo Houseabundo.",
    bio: `Pepe Levine t.c.c. José el Divino es un productor y beatmaker italiano muy conocido en su país por organizar fiestas y tardeadas en bares y discotecas a principios de los años 2000.

José nace en Milán Italia, específicamente en el barrio Quadrilatero della Moda en 1976, al poco tiempo de nacido sus padres se mudan de país y llegan al Distrito Federal, específicamente a la Delegación Azcapotzalco, de hecho, vivía a lado del cantante José José. En su adolescencia él y su familia pasaban varios meses del año en Nueva York, solo por el puro gusto de vivir. Al ser mayor de edad Pepe Levine decide asentarse en el D.F. Tiene todo el porte de un italiano, la cultura de un estadounidense y las mañas de un chilango.

Su gusto por la House Music nace precisamente en Nueva York, ahí escucha el Deep House hecho en Nueva Jersey y el Reino Unido. Su fanatismo llega a tal grado que en su regreso a la Ciudad de México compra equipo para hacer beats sin tener una idea clara de cómo hacerlos, pero con la firme convicción de lograrlo. Años más tarde en 1996, por fin logra su objetivo, se convierte en beatmaker y productor de House.

Tiempo después recuerda sus orígenes y va a probar suerte a Milán Italia, diciendo: "Nadie es profeta en su tierra". Pasa varios años en Milán donde tiene grandes presentaciones y fiestas en los bares más conocidos de la ciudad y de países circunvecinos, pero debido a los excesos con drogas, mujeres y la buena comida, José tiene problemas con la mafia italiana y su carrera es cortada de tajo, regresando a México huyendo de la mafia.

A principios del 2019, ya instalado en la Ciudad de México, José el Divino quiere tomar un segundo aire y empieza a hacer beats, teniendo en mente realizar una presentación para el año siguiente. Esto nunca pasa porque el día que anuncia la fecha el Covid-19 atacó al mundo.

Un año después, en el 2021, Pepe recuerda a su amiga Edmeé García t.c.c. Diosaloca, hablan por varios días sobre música y en una de esas pláticas Pepe le pregunta si conoce a alguien que haga beats. Ella le presenta a Rodrigo Tovar t.c.c. Doctor Destino y Led Serrano t.c.c. Zaque. La relación de amistad crece a tal punto que Doctor, Zaque y Pepe comienzan a trabajar en un proyecto llamado El Veraneo Houseabundo (2022), esperando que Pepe Levine tenga el mismo éxito que en sus años mozos.

Escrita por: César Yáñez t.c.c. Don Drama`,
    pressQuotes: [
      {
        quote: "En el verano uno quiere más ligereza, es por el mismo clima que quieres más party. Doctor y yo escuchamos mucho house, así que desde hace diez años queríamos hacer un disco de house.",
        source: "Zaque para Sonido Líquido",
        sourceUrl: "https://sonidoliquido.com"
      }
    ]
  },

  // ===============================================
  // REICK ONE
  // ===============================================
  {
    slug: "reick-one",
    shortBio: "DJ de hip hop originario de Vallejo, CDMX. Gran conocedor de la historia y actualidad del hip hop, cofundador de Lado B.",
    bio: `Daniel López t.c.c. Reick Uno es un DJ de hip hop originario de Vallejo en la CDMX, miembro de Sonido Líquido Crew y cofundador de Lado B. En palabras de Led Serrano t.c.c. Zaque: "Reick es un gran conocedor tanto de la actualidad de hip hop como de su historia. Además es un graff head y un arquitecto. Siempre tiene buenas ideas sobre las cosas que le muestro y complementa muy bien mi trabajo".

Ha participado en múltiples producciones: Yo creo en esto (2016), Flow de lujo (2017), El Ascenso (2020), Aza: Intimidación (2020), Octubre 31 (2020), Aza: Intimidación Instrumental (2021), Crónicas de un agarraculos (2021), B(u)da (2021), Póker (2022), Sonido de Lujo (2022), Tumbao (2022), Gospel (2022) y Oasis (2022).

Su primer encuentro con hip hop ocurrió en 1989 con Rico Suave de Gerardo, luego llegaron las Tortugas Ninja. "En la banda sonora participaron varios grupos de rap dance. El primero que me encantó fue el 36 Chambers de Wu-Tang Clan."

Además de ser DJ, Reick tiene otras cualidades importantes: paciencia, buen gusto, una mente abierta y una memoria notable. A mediados de los noventa vio a Lifestyle La Familia: "Eran tres adolescentes que se subieron a rapear con jerseys de los Raiders de la NFL: Zaque, Zqualo y BocaFloja. Sentí que el sonido que producían esos chicos era muy superior."

"Cuando hice mi primer graffiti fue en las canchas de la colonia y escribí 'Rappers' en letras enormes. Más tarde en los primeros años de prepa me afilié con graffiteros más experimentados. Over del crew F.B.I. (Q.E.P.D), era como mi protector y me dijo: ¿por qué no firmas como Reick? Las letras están chidas."

Conoció al crew en fiestas de hip hop viendo a DJ Freak tocar en el Centro Cultural España. Junto con Karim fundó Lado B. "La primera fiesta de Lado B fue cuando Led sacó Mujerez." En 2020 durante la pandemia Zaque lo invitó a ser parte de Sonido Líquido Crew.

"Hay un montón de música que no se conoce y yo tengo mucha guardada que vale la pena. La gente se conforma con muy poquito. En el hip hop hay música para todo lo que quieras: comer, correr, bailar, estar triste."

De acuerdo con DJ Freak: "Reick es uno de los pocos DJs que tiene un conocimiento muy amplio sobre el hip hop. Tiene la capacidad de no juzgar tan a priori lo que encuentra. Cada tercer día comparte un disco que nadie conoce. Él es nuestro diggero."

Escrita por: Edmeé García t.c.c. Diosaloca Mx`,
    pressQuotes: [
      {
        quote: "Reick es un gran conocedor tanto de la actualidad de hip hop como de su historia. Además es un graff head y un arquitecto, es bueno en todas esas cosas. Siempre tiene buenas ideas sobre las cosas que le muestro y complementa muy bien mi trabajo.",
        source: "Zaque para Sonido Líquido",
        sourceUrl: "https://sonidoliquido.com"
      },
      {
        quote: "Reick es uno de los pocos DJs que tiene un conocimiento muy amplio sobre el hip hop. Cada tercer día comparte un disco que nadie conoce. Él es nuestro diggero.",
        source: "DJ Freak para Sonido Líquido",
        sourceUrl: "https://sonidoliquido.com"
      }
    ]
  },

  // ===============================================
  // X SANTA-ANA
  // ===============================================
  {
    slug: "x-santa-ana",
    shortBio: "DJ originario de CDMX. Miembro de Lado B desde 2015 y de Sonido Líquido Crew desde 2020. Formado bajo la tutela de Reick Uno y Chas7P.",
    bio: `Ulises Carreño t.c.c. X Santa-Ana es un DJ originario de la Ciudad de México. Ha sido miembro de Lado B desde 2015 y en 2020 se unió oficialmente a Sonido Líquido Crew. Algunos dirán que Ulises tiene una buena estrella, pues conoció a los miembros del crew en un evento cuando apenas tenía diecisiete años; pero también ha sabido aprovechar cada oportunidad para aprender, practicar e irse volviendo cada vez mejor.

Ha participado en Flow de Lujo (2017), Médium (2020), Octubre 31 (2020), Canción de Amor (2021), B(u)da (2021), Sonido de Lujo (2022), Tumbao (2022), Gospel (2022) y Oasis (2022).

Su primer contacto con hip hop ocurrió en su infancia. "Cuando yo era niño, ya hip hop era global. Había referencias en muchas partes, sonaban 50 Cent y Eminem. Cuando iba en la secundaria me gustó mucho porque fue como adoptar mi estilo."

En 2015 fue a un evento de Tino el Pingüino donde conoció al crew. "Ya conocía a Zaque porque escuchaba mucho El día y la noche en el infierno. Se sentaron junto a nosotros y así empezó una bonita amistad." Zaque recuerda: "Era menor de edad, pero nos cayó muy bien y nos lo llevamos a cenar. Nos dijo: no se olviden de mí."

"Siempre había querido hacer algo en hip hop, quería rapear pero no me gustaba mi voz. Me empecé a juntar con Reick porque ambos jugamos basquet. Él me invitaba a su casa y yo veía sus tornas, así que un día le pedí que me enseñara."

Pedro le dio unas tornas Technics 1200 y le dijo: "Tienes un año para rifar, si no lo haces te vas, pero si rifas, te quedas con las tornas."

Reick le dio las bases y un día rompió una aguja. "Chas me dijo dónde conseguir el reemplazo y se ofreció a acompañarme. Le pregunté si podía caerle. Yo estaba desesperado por quedarme las tornas y Chas se me hacía muy bueno."

"Me despertaba a las ocho, ensayaba una hora, desayunaba, me bañaba y salía a casa de Chas. Me enseñaba scratches, rutinas y tornamesismo. Fueron varios meses."

De acuerdo con Chas7P: "Es muy bueno y el tener mentores le ha ayudado a evolucionar de manera rápida. Lo que nos ha tomado diez o quince años, él ahora lo está aprovechando. Compitió en skills y quedó en un buen lugar, creo que fue cuarto o algo así. Ulises fue el caballo negro, ganándole a varios que ya llevaban años."

El nombre X Santa-Ana surgió de su bisabuelo músico Felix Santa-Ana. "Quiero tomar cursos de scratching. Estoy tratando de aprender de hip hop lo más que se pueda. Sí creo que voy a seguir haciendo esto toda mi vida."

Escrita por: Edmeé García t.c.c. Diosaloca Mx`,
    pressQuotes: [
      {
        quote: "El X es un competidor, desde que lo conocí era notorio. Le di unas tornas para que entrenara y después de un año ya estaba en algo. Estoy muy orgulloso de él. Aprende rápido, se dedica y se concentra.",
        source: "Zaque para Sonido Líquido",
        sourceUrl: "https://sonidoliquido.com"
      },
      {
        quote: "Es muy bueno y el tener mentores le ha ayudado a evolucionar de manera rápida. Lo que nos ha tomado diez o quince años, él ahora lo está aprovechando.",
        source: "Chas7P para Sonido Líquido",
        sourceUrl: "https://sonidoliquido.com"
      }
    ]
  },

  // ===============================================
  // ZAQUE
  // ===============================================
  {
    slug: "zaque",
    shortBio: "Fundador de Sonido Líquido Crew. Productor y rapero pionero del hip hop mexicano desde 1999. También conocido como Pedro Pe.",
    bio: `Led Serrano, también conocido como Zaque y Pedro Pe, es un productor de hip hop y rapero originario de la Ciudad de México. Se ha presentado en dos ocasiones en el Vive Latino y ha participado como acto abridor en conciertos de Method Man, Violadores del Verso y Mucho Muchacho. También es el fundador de Sonido Líquido Crew, que en sus propias palabras es "lo más avanzado de hip hop en México", del que han emergido raperos como Tino el Pingüino y Eric el Niño. Junto con Lado B—la división de DJs de Sonido Líquido Crew—organiza fiestas de hip hop en las que se han presentado personalidades como Stretch Armstrong, Bobbito García y DJ Maseo de De La Soul.

El evento que realmente lo introdujo al mundo del hip hop ocurrió en 1994 cuando Codak, quien también fue miembro de SLC, "trajo un tesoro auditivo de hip hop chido que incluía a Redman, Cypress Hill y Wu-Tang Clan". La escucha repetitiva de esos tracks lo motivó a trabajar en sus raps y así fue como emergió Zake, que en 2012 se volvió Zaque "porque es más mexicano". A lo largo de su trayectoria, esas influencias se vieron cristalizadas en diversas colaboraciones, así como en su discografía que incluye El día y la noche en el infierno (EMI, 2006), Mujerez (SL, 2014) y Flow de lujo (SL, 2017).

A partir del año siguiente Zaque entró en una etapa muy productiva. Todo empezó con 2 Gramos (2018), un sencillo de Bruno Grasso. Luego se dio a la tarea de producir De la noche y sus efectos (2018). Los resultados de dicha colaboración fueron suficientemente buenos para llevar a El Ascenso (2020), donde el fundador de Sonido Líquido Crew cuenta su experiencia observando el proceso de diferentes aspirantes.

Luego Led decidió unir lo nuevo con lo viejo para realizar Aza: Intimidación (2020). A continuación Zaque también hizo público Aza: Intimidación (Instrumental) (2021). A continuación realizó Canción de amor (2021), "la única canción de amor que tengo que se la dedico a hip hop, por ser el amor de mi vida."

La colaboración de Zaque y Doctor Destino dio fruto en B(u)da (2021) y El Veraneo Houseabundo de Pepe Levine (2022). También salió Crónicas de un agarraculos (2021) de Codak, y Sonido de Lujo (2022) con Brez.

Escape al purgatorio (2023) es la segunda parte de una trilogía que empieza con El día y la noche en el infierno (2006) y termina con El Séptimo cielo. "Se parece a El día y la noche porque tiene karatazos, pero también cuestiones autobiográficas y reflexiones. Hay una evolución, que va del sufrimiento sin sentido en el infierno al sufrimiento con sentido que es el purgatorio."

"Como productor, el beat a veces es más importante que el rapeo, porque si la base está bien, lo que le pongas encima va a funcionar. No puedes tener música buena si el beat no está bueno." En la actualidad Zaque sigue levantándose todos los días para producir beats, escuchar hip hop y reflexionar sobre todo tipo de situaciones y temas que terminan por plasmarse en sus letras.

Escrita por: Edmeé García t.c.c. Diosaloca Mx`,
    pressQuotes: [
      {
        quote: "Rapear es una cuestión de estar en forma, no de ser una estrella o vivir de la autopromoción; se trata de lo que estás haciendo.",
        source: "Zaque para Sonido Líquido",
        sourceUrl: "https://sonidoliquido.com"
      },
      {
        quote: "Como productor, el beat a veces es más importante que el rapeo, porque si la base está bien, lo que le pongas encima va a funcionar. No puedes tener música buena si el beat no está bueno.",
        source: "Zaque para Sonido Líquido",
        sourceUrl: "https://sonidoliquido.com"
      }
    ]
  },
];

async function updateArtists() {
  console.log("🚀 Updating artist bios and press kit data...\n");

  for (const artist of artistUpdates) {
    console.log(`📀 Processing: ${artist.slug}`);

    try {
      // Update bio and shortBio
      await client.execute({
        sql: `UPDATE artists SET bio = ?, short_bio = ?, updated_at = unixepoch() WHERE slug = ?`,
        args: [artist.bio, artist.shortBio, artist.slug]
      });
      console.log(`  ✓ Updated bio`);

      // Update press quotes if provided
      if (artist.pressQuotes) {
        await client.execute({
          sql: `UPDATE artists SET press_quotes = ?, updated_at = unixepoch() WHERE slug = ?`,
          args: [JSON.stringify(artist.pressQuotes), artist.slug]
        });
        console.log(`  ✓ Updated ${artist.pressQuotes.length} press quotes`);
      }

      // Update featured videos if provided
      if (artist.featuredVideos) {
        await client.execute({
          sql: `UPDATE artists SET featured_videos = ?, updated_at = unixepoch() WHERE slug = ?`,
          args: [JSON.stringify(artist.featuredVideos), artist.slug]
        });
        console.log(`  ✓ Updated ${artist.featuredVideos.length} featured videos`);
      }

    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  console.log("\n✅ Done!");
  process.exit(0);
}

updateArtists();
