import type { Lang } from '../i18n/messages'

export type LegalDocId = 'user-agreement' | 'privacy' | 'kyc-aml'

export type LegalSection = {
  heading: string
  paragraphs: string[]
}

export type LegalDocument = {
  title: string
  intro: string
  sections: LegalSection[]
}

const ru: Record<LegalDocId, LegalDocument> = {
  'user-agreement': {
    title: 'Пользовательское соглашение',
    intro:
      'Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует отношения между сервисом DuckJackpot (далее — «Сервис») и физическим лицом, использующим Telegram Mini App DuckJackpot (далее — «Пользователь»). Соглашение является публичной офертой. Пользование Сервисом допускается только после принятия Соглашения.',
    sections: [
      {
        heading: '1. Предмет соглашения',
        paragraphs: [
          'Сервис предоставляет доступ к цифровому магазину коллекционных карточек (NFT-дроп) в блокчейне TON. Карточка является цифровым коллекционным объектом ограниченного тиража. К покупке карточки может прилагаться бонус в виде участия в розыгрыше призового фонда, выплачиваемого в USDT в сети TON.',
          'Оплата карточек осуществляется исключительно цифровыми активами: TON (также известным как GRAM) и USDT в сети TON. Сервис не принимает и не обрабатывает платежи в национальных валютах и не оказывает банковские или платёжные услуги в фиатной валюте.',
        ],
      },
      {
        heading: '2. Условия доступа',
        paragraphs: [
          'Пользователь подтверждает, что ему исполнилось 18 лет, он обладает полной дееспособностью и действует от собственного имени, а не в интересах третьих лиц, если иное не согласовано с Сервисом.',
          'Пользователь обязан пройти предварительную AML-проверку в объёме, запрошенном Сервисом, до совершения покупки. Сервис вправе отказать в доступе без объяснения причин, если это требуется для соблюдения политики противодействия отмыванию доходов и финансированию терроризма.',
        ],
      },
      {
        heading: '3. Покупка карточки',
        paragraphs: [
          'Цена карточки отображается в интерфейсе. Рублёвый эквивалент приводится исключительно как справочная величина и не означает возможность оплаты в рублях или иной фиатной валюте.',
          'Покупка считается совершённой после подтверждения перевода TON (GRAM) или USDT в блокчейне TON на адрес, указанный Сервисом. После успешной транзакции Пользователю выдаётся карточка с уникальным номером, а счётчик проданных карточек соответствующего тиража увеличивается.',
          'Цифровой актив, направленный Пользователем, не подлежит возврату после подтверждения транзакции в блокчейне, за исключением случаев, когда возврат прямо предусмотрен применимым правом или решением Сервиса.',
        ],
      },
      {
        heading: '4. Розыгрыш как бонус',
        paragraphs: [
          'Участие в розыгрыше является бонусом к покупке коллекционной карточки, а не самостоятельной азартной услугой и не ставкой в фиатной валюте. Правила конкретного тиража, размер призового фонда и порядок определения победителей публикуются в интерфейсе Сервиса.',
          'Призы выплачиваются в USDT на TON-кошелёк Пользователя. Сервис не гарантирует сроки сети TON и не несёт ответственности за недоступность кошелька Пользователя.',
        ],
      },
      {
        heading: '5. Ограничения и ответственность',
        paragraphs: [
          'Пользователю запрещено использовать Сервис для легализации доходов, полученных преступным путём, финансирования терроризма, обхода санкционных ограничений, мошенничества и иных противоправных целей.',
          'Сервис предоставляется в режиме «как есть» (BETA). Организатор не несёт ответственности за перерывы в работе Telegram, кошельков TON Connect, сети TON и сторонних API, а также за действия Пользователя, связанные с утратой доступа к кошельку.',
        ],
      },
      {
        heading: '6. Изменение условий',
        paragraphs: [
          'Сервис вправе обновлять настоящее Соглашение. Продолжение использования после публикации новой редакции означает согласие с изменениями. Существенные изменения доводятся до Пользователя в интерфейсе Сервиса.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Политика конфиденциальности',
    intro:
      'Настоящая Политика конфиденциальности описывает, какие данные обрабатывает DuckJackpot, для каких целей и на каких основаниях. Политика применяется к Telegram Mini App DuckJackpot и связанным страницам «Правила».',
    sections: [
      {
        heading: '1. Оператор и объём',
        paragraphs: [
          'Оператором обработки является организатор Сервиса DuckJackpot. Обработка ограничивается данными, необходимыми для предоставления цифровых коллекционных карточек, проведения бонусного розыгрыша и выполнения требований KYC/AML.',
          'Сервис не запрашивает банковские реквизиты и не обрабатывает платёжные данные фиатных счетов, поскольку оплата производится только цифровыми активами TON (GRAM) и USDT в сети TON.',
        ],
      },
      {
        heading: '2. Категории данных',
        paragraphs: [
          'Могут обрабатываться: идентификатор и публичное имя в Telegram (если Mini App открыто в Telegram); адрес TON-кошелька, подключённого через TON Connect; сведения о транзакциях в блокчейне TON (хеш, сумма, актив, время); номер выданной карточки и идентификатор тиража; ответы предварительной AML-проверки; технические данные устройства и локального хранилища браузера.',
          'Данные, размещённые Пользователем в публичном блокчейне TON, являются общедоступными по своей природе. Сервис не контролирует копирование таких данных третьими лицами.',
        ],
      },
      {
        heading: '3. Цели и правовые основания',
        paragraphs: [
          'Данные обрабатываются для: исполнения Соглашения (выдача карточки, учёт тиража); обеспечения безопасности и противодействия отмыванию доходов и финансированию терроризма; связи с Пользователем по вопросам покупки и выплаты приза в USDT; улучшения стабильности Mini App.',
          'Правовые основания: заключение и исполнение договора с Пользователем; законный интерес в защите Сервиса от злоупотреблений; исполнение обязанностей, связанных с противодействием легализации преступных доходов и финансированию терроризма, в применимой мере.',
        ],
      },
      {
        heading: '4. Хранение и передача',
        paragraphs: [
          'Часть сведений на текущем этапе BETA может храниться локально на устройстве Пользователя. При подключении серверной инфраструктуры данные могут храниться у Оператора и его процессоров (хостинг, аналитика в обезличенном виде).',
          'Передача третьим лицам допускается: провайдерам кошельков TON Connect по инициативе Пользователя; провайдерам блокчейн-индексации для проверки транзакций; компетентным органам — при наличии законного требования.',
        ],
      },
      {
        heading: '5. Права Пользователя',
        paragraphs: [
          'Пользователь вправе запросить сведения об обработке, исправление неточных данных, ограничение обработки и удаление данных, которые не требуются для исполнения Соглашения, AML-обязанностей или требований закона. Удаление не затрагивает записи в блокчейне TON.',
          'Вопросы по конфиденциальности направляются через каналы поддержки, указанные в профиле Сервиса.',
        ],
      },
    ],
  },
  'kyc-aml': {
    title: 'Политика KYC и AML',
    intro:
      'Настоящая Политика по противодействию легализации (отмыванию) доходов, полученных преступным путём, и финансированию терроризма (далее — «Политика KYC/AML») устанавливает принципы, цели и меры внутреннего контроля сервиса DuckJackpot при обороте виртуальных активов TON (GRAM) и USDT в сети TON. Политика не регулирует приём или выплату фиатной валюты.',
    sections: [
      {
        heading: '1. Общие положения и правовая база',
        paragraphs: [
          '1.1. Политика разработана с учётом общепризнанных международных стандартов Группы разработки финансовых мер борьбы с отмыванием денег (FATF), включая Рекомендации FATF, применимые к виртуальным активам и провайдерам услуг в сфере виртуальных активов, а также принципов риск-ориентированного подхода.',
          '1.2. Сервис исходит из недопустимости использования цифровых коллекционных карточек, бонусного розыгрыша и связанных переводов TON (GRAM) и USDT для легализации преступных доходов, финансирования терроризма, финансирования распространения оружия массового уничтожения, обхода санкционных режимов и иной противоправной деятельности.',
          '1.3. Политика обязательна для организатора Сервиса, уполномоченных лиц, привлекаемых подрядчиков в части, касающейся контроля, и для Пользователей в объёме их обязанностей, установленных Соглашением и настоящей Политикой.',
          '1.4. Правовая база включает: применимое законодательство юрисдикции организатора в сфере ПОД/ФТ; международные санкционные списки и перечни лиц, причастных к террористической деятельности, в той мере, в какой они обязательны или разумно применимы к Сервису; внутренние регламенты DuckJackpot, включая процедуру предварительной AML-проверки.',
          '1.5. Сервис не является кредитной организацией и не открывает фиатные счета. Контрольные процедуры применяются к операциям с виртуальными активами и к идентификации Пользователя в объёме, соразмерном риску продукта.',
        ],
      },
      {
        heading: '2. Цели политики',
        paragraphs: [
          '2.1. Предотвращение использования Сервиса в схемах отмывания доходов и финансирования терроризма.',
          '2.2. Выявление, оценка и снижение рисков, связанных с анонимностью виртуальных активов, смешением источников происхождения цифровых средств и использованием сторонних кошельков.',
          '2.3. Обеспечение прозрачности происхождения средств в части, доступной Сервису (история подключенного TON-кошелька, характер транзакций покупки карточки).',
          '2.4. Создание внутреннего контроля: правила приёма Пользователей, мониторинг операций, хранение сведений, эскалация подозрительной активности.',
          '2.5. Защита добросовестных Пользователей и репутации Сервиса, а также содействие законным запросам компетентных органов в пределах применимого права.',
        ],
      },
      {
        heading: '3. Основные принципы',
        paragraphs: [
          '3.1. Риск-ориентированный подход: интенсивность идентификации (KYC) и мониторинга зависит от уровня риска Пользователя, юрисдикции, суммы и характера операций с TON (GRAM) и USDT.',
          '3.2. Запрет на обслуживание анонимных клиентов в объёме, превышающем минимально необходимый для Mini App: покупка карточки допускается только при принятии Соглашения, Политики конфиденциальности и прохождении предварительной AML-проверки.',
          '3.3. Принцип «знай своего клиента» (KYC): Сервис вправе запросить дополнительные сведения и документы, подтверждающие личность, бенефициарную принадлежность и источник виртуальных активов.',
          '3.4. Недопустимость работы с лицами из санкционных перечней, лицами, связанными с террористической деятельностью, и кошельками, в отношении которых имеются обоснованные сведения о причастности к противоправной активности.',
          '3.5. Соразмерность: меры контроля не должны создавать фиктивного банковского контура и не предполагают приёма национальной валюты.',
          '3.6. Конфиденциальность контрольных процедур: детали мониторинга не раскрываются Пользователю в объёме, который мог бы способствовать обходу контроля, за исключением общей информации о статусе проверки.',
        ],
      },
      {
        heading: '4. Меры внутреннего контроля',
        paragraphs: [
          '4.1. Идентификация и верификация. Базовый уровень: подтверждение возраста и дееспособности, действие от собственного имени, принятие правовых документов, подключение кошелька через TON Connect. Усиленный уровень (по запросу): документ, удостоверяющий личность; подтверждение адреса; пояснение источника TON (GRAM) и USDT; сведения о бенефициаре, если Пользователь действует не в своих интересах.',
          '4.2. Предварительная AML-проверка (pre-AML screening) проводится до покупки карточки и включает декларации Пользователя, предусмотренные отдельной процедурой. Отказ от прохождения проверки блокирует покупку.',
          '4.3. Мониторинг операций. Сервис вправе анализировать входящие переводы на адрес получения оплаты, сопоставлять сумму и актив с заявленной покупкой, учитывать повторяющиеся операции, дробление платежей и использование множества кошельков.',
          '4.4. Контроль санкционных и иных ограничительных списков в отношении идентификаторов, доступных Сервису (в том числе адреса кошелька), с использованием внутренних и/или внешних источников в разумной мере.',
          '4.5. Приостановление и отказ. При выявлении индикаторов риска Сервис вправе приостановить выдачу карточки, не зачислять бонусное участие в розыгрыше, запросить пояснения и отказать в дальнейшем обслуживании. Цифровые активы, уже подтверждённые сетью TON, обращаются в соответствии с Соглашением и применимым правом; автоматический возврат не гарантируется.',
          '4.6. Хранение сведений. Сведения о проверках, декларациях pre-AML, адресе кошелька, хеше транзакции и выданном номере карточки хранятся не менее срока, необходимого для исполнения обязанностей ПОД/ФТ и разрешения споров, и не менее пяти лет, если более длительный срок не следует из применимого права.',
          '4.7. Обучение и ответственность уполномоченных лиц. Лица, допущенные к администрированию Сервиса, обязаны соблюдать Политику, не содействовать обходу контроля и эскалировать подозрительные случаи.',
          '4.8. Взаимодействие с компетентными органами осуществляется в порядке и объёме, предусмотренных применимым законодательством, без предварительного уведомления Пользователя, если такое уведомление запрещено или ставит под угрозу проверку.',
        ],
      },
      {
        heading: '5. Права и обязанности пользователей',
        paragraphs: [
          '5.1. Пользователь обязан предоставлять достоверные сведения, своевременно обновлять их и не препятствовать проверке. Предоставление ложных деклараций является основанием для отказа в обслуживании.',
          '5.2. Пользователь обязан использовать только кошелёк, которым он законно владеет, и виртуальные активы, происхождение которых является законным. Запрещается оплата карточек средствами третьих лиц, если это не раскрыто Сервису и не согласовано в рамках усиленной проверки.',
          '5.3. Пользователь обязан по обоснованному запросу Сервиса предоставить дополнительные документы и пояснения в разумный срок. Непредставление сведений приравнивается к невозможности завершить идентификацию.',
          '5.4. Пользователь вправе ознакомиться с настоящей Политикой, Политикой конфиденциальности и Соглашением; запросить статус проверки в пределах, не нарушающих конфиденциальность контроля; отозвать согласие на дальнейшее использование Сервиса, понимая, что уже совершённые блокчейн-операции необратимы.',
          '5.5. Пользователь несёт ответственность за соблюдение законов своей юрисдикции, включая ограничения на операции с виртуальными активами. Сервис не консультирует по налоговому учёту цифровых активов.',
          '5.6. Совершая покупку, Пользователь подтверждает, что ознакомился с Политикой KYC/AML, понимает риск-ориентированный характер контроля и соглашается с возможностью дополнительной проверки до или после транзакции.',
        ],
      },
    ],
  },
}

const en: Record<LegalDocId, LegalDocument> = {
  'user-agreement': {
    title: 'User Agreement',
    intro:
      'This User Agreement (the “Agreement”) governs the relationship between the DuckJackpot service (the “Service”) and any individual using the DuckJackpot Telegram Mini App (the “User”). The Agreement is a public offer. Access is granted only after the User accepts it.',
    sections: [
      {
        heading: '1. Subject matter',
        paragraphs: [
          'The Service provides a digital shop of collectible cards (an NFT drop) on the TON blockchain. A card is a limited-edition digital collectible. A purchase may include a bonus entry into a prize draw paid in USDT on TON.',
          'Cards are paid for exclusively with digital assets: TON (also known as GRAM) and USDT on the TON network. The Service does not accept or process payments in national currencies and does not provide fiat banking or payment services.',
        ],
      },
      {
        heading: '2. Access',
        paragraphs: [
          'The User confirms that they are at least 18 years old, have full legal capacity and act on their own behalf, unless otherwise agreed with the Service.',
          'The User must complete pre-AML screening to the extent requested by the Service before purchasing. The Service may refuse access where required to comply with anti-money laundering and counter-terrorist financing policy.',
        ],
      },
      {
        heading: '3. Purchasing a card',
        paragraphs: [
          'The card price is shown in the interface. Any ruble equivalent is informational only and does not enable payment in rubles or any other fiat currency.',
          'A purchase is completed after a TON (GRAM) or USDT transfer is confirmed on the TON blockchain to the address specified by the Service. After a successful transaction the User receives a card with a unique serial number and the sold counter for that drop is increased.',
          'Digital assets sent by the User are not refundable after on-chain confirmation, except where a refund is required by applicable law or expressly granted by the Service.',
        ],
      },
      {
        heading: '4. Raffle as a bonus',
        paragraphs: [
          'Raffle participation is a bonus attached to the collectible card. It is not a standalone gambling product and is not a fiat wager. Drop rules, the prize pool and winner selection are published in the Service interface.',
          'Prizes are paid in USDT to the User’s TON wallet. The Service does not guarantee TON network timing and is not responsible if the User’s wallet is unavailable.',
        ],
      },
      {
        heading: '5. Restrictions and liability',
        paragraphs: [
          'The User must not use the Service to launder criminal proceeds, finance terrorism, evade sanctions, commit fraud or pursue other unlawful purposes.',
          'The Service is provided “as is” (BETA). The organizer is not liable for outages of Telegram, TON Connect wallets, the TON network or third-party APIs, or for the User losing access to a wallet.',
        ],
      },
      {
        heading: '6. Changes',
        paragraphs: [
          'The Service may update this Agreement. Continued use after a new version is published constitutes acceptance. Material changes are communicated in the Service interface.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro:
      'This Privacy Policy describes which data DuckJackpot processes, for which purposes and on which grounds. It applies to the DuckJackpot Telegram Mini App and the related Legal pages.',
    sections: [
      {
        heading: '1. Controller and scope',
        paragraphs: [
          'The controller is the organizer of DuckJackpot. Processing is limited to data needed to deliver collectible cards, run the bonus raffle and meet KYC/AML requirements.',
          'The Service does not request bank details and does not process fiat payment data, because payment is made only with TON (GRAM) and USDT on TON.',
        ],
      },
      {
        heading: '2. Categories of data',
        paragraphs: [
          'We may process: Telegram identifier and public name (if the Mini App is opened in Telegram); the TON wallet address connected via TON Connect; on-chain transaction data (hash, amount, asset, time); issued card serial and drop identifier; pre-AML questionnaire answers; device and local browser storage technical data.',
          'Data the User publishes on the public TON blockchain is public by nature. The Service does not control copying of such data by third parties.',
        ],
      },
      {
        heading: '3. Purposes and legal bases',
        paragraphs: [
          'Data is processed to: perform the Agreement (issuing a card, tracking the drop); protect the Service and counter money laundering and terrorist financing; contact the User about a purchase or a USDT prize; improve Mini App stability.',
          'Legal bases: entering into and performing a contract with the User; legitimate interest in preventing abuse; AML/CFT duties to the extent applicable.',
        ],
      },
      {
        heading: '4. Storage and sharing',
        paragraphs: [
          'During BETA, some records may be stored locally on the User’s device. If server infrastructure is added, data may be stored by the Operator and its processors (hosting, aggregated analytics).',
          'Sharing is allowed with: TON Connect wallet providers at the User’s initiative; blockchain indexers used to verify payments; competent authorities when legally required.',
        ],
      },
      {
        heading: '5. User rights',
        paragraphs: [
          'The User may request access, correction, restriction and deletion of data that is not required for the Agreement, AML duties or law. Deletion does not affect records on the TON blockchain.',
          'Privacy requests may be sent through the support channels shown in the Service profile.',
        ],
      },
    ],
  },
  'kyc-aml': {
    title: 'KYC & AML Policy',
    intro:
      'This Know-Your-Customer and Anti-Money Laundering / Counter-Terrorist Financing Policy (the “KYC/AML Policy”) sets out the principles, objectives and internal controls of DuckJackpot for virtual assets TON (GRAM) and USDT on the TON network. The Policy does not govern acceptance or payout of fiat currency.',
    sections: [
      {
        heading: '1. General provisions and legal basis',
        paragraphs: [
          '1.1. The Policy is prepared in light of internationally recognized FATF standards, including FATF Recommendations applicable to virtual assets and virtual asset service providers, and the risk-based approach.',
          '1.2. The Service must not be used to launder criminal proceeds, finance terrorism, finance proliferation, evade sanctions or otherwise commit unlawful acts through collectible cards, the bonus raffle, or transfers of TON (GRAM) and USDT.',
          '1.3. The Policy binds the organizer, authorized personnel, relevant contractors, and Users to the extent of duties in the Agreement and this Policy.',
          '1.4. The legal basis includes: AML/CFT laws of the organizer’s jurisdiction; international sanctions and terrorism-related lists to the extent mandatory or reasonably applicable; DuckJackpot internal rules, including pre-AML screening.',
          '1.5. The Service is not a credit institution and does not open fiat accounts. Controls apply to virtual-asset operations and User identification in proportion to product risk.',
        ],
      },
      {
        heading: '2. Policy objectives',
        paragraphs: [
          '2.1. Prevent use of the Service for money laundering and terrorist financing.',
          '2.2. Identify, assess and mitigate risks arising from virtual-asset anonymity, commingled sources of digital funds and third-party wallets.',
          '2.3. Support transparency of funds to the extent available to the Service (connected TON wallet history and the nature of the card-purchase transaction).',
          '2.4. Establish internal control: onboarding rules, transaction monitoring, record-keeping and escalation of suspicious activity.',
          '2.5. Protect bona fide Users and the Service, and respond to lawful requests from competent authorities.',
        ],
      },
      {
        heading: '3. Core principles',
        paragraphs: [
          '3.1. Risk-based approach: the intensity of KYC and monitoring depends on User risk, jurisdiction, amount and nature of TON (GRAM) and USDT activity.',
          '3.2. No anonymous onboarding beyond the Mini App minimum: a card may be purchased only after accepting the legal documents and completing pre-AML screening.',
          '3.3. Know Your Customer: the Service may request additional information and documents on identity, beneficial ownership and the source of virtual assets.',
          '3.4. No business with sanctioned persons, persons linked to terrorism, or wallets reasonably believed to be involved in unlawful activity.',
          '3.5. Proportionality: controls must not create a sham banking channel and do not involve accepting national currency.',
          '3.6. Confidentiality of controls: monitoring details are not disclosed to the User to the extent disclosure would enable circumvention, except high-level status information.',
        ],
      },
      {
        heading: '4. Internal control measures',
        paragraphs: [
          '4.1. Identification and verification. Baseline: age and capacity, acting on one’s own behalf, acceptance of legal documents, wallet connection via TON Connect. Enhanced (on request): identity document; address confirmation; explanation of the source of TON (GRAM) and USDT; beneficial owner information if the User is not acting for themselves.',
          '4.2. Pre-AML screening is completed before a card purchase and includes User declarations in a separate procedure. Refusal blocks the purchase.',
          '4.3. Transaction monitoring. The Service may review incoming transfers to the payment address, match amount and asset to the purchase, and consider repeated operations, structuring and use of multiple wallets.',
          '4.4. Screening against sanctions and other restrictive lists for identifiers available to the Service (including wallet address), using internal and/or external sources as reasonably available.',
          '4.5. Suspension and refusal. If risk indicators appear, the Service may pause card issuance, withhold bonus raffle entry, request explanations and refuse further service. Assets already confirmed on TON are handled under the Agreement and applicable law; an automatic refund is not guaranteed.',
          '4.6. Record-keeping. Screening data, pre-AML declarations, wallet address, transaction hash and issued serial are retained for at least as long as needed for AML/CFT duties and disputes, and for no less than five years unless a longer period is required by law.',
          '4.7. Personnel. Persons administering the Service must follow this Policy, must not facilitate circumvention and must escalate suspicious cases.',
          '4.8. Engagement with competent authorities is carried out as required by applicable law, without prior User notice where notice is prohibited or would prejudice an inquiry.',
        ],
      },
      {
        heading: '5. User rights and duties',
        paragraphs: [
          '5.1. The User must provide accurate information, keep it current and not obstruct screening. False declarations are grounds for refusal of service.',
          '5.2. The User must use only a wallet they lawfully control and virtual assets of lawful origin. Paying with third-party funds is prohibited unless disclosed and approved under enhanced due diligence.',
          '5.3. On a reasonable request, the User must provide additional documents and explanations within a reasonable time. Failure to provide information equals failed identification.',
          '5.4. The User may review this Policy, the Privacy Policy and the Agreement; request screening status to the extent that does not compromise controls; and stop using the Service, understanding that completed blockchain operations are irreversible.',
          '5.5. The User is responsible for the laws of their jurisdiction, including virtual-asset restrictions. The Service does not provide tax advice on digital assets.',
          '5.6. By purchasing, the User confirms they have read the KYC/AML Policy, understand risk-based controls and accept possible additional screening before or after a transaction.',
        ],
      },
    ],
  },
}

const docs: Record<Lang, Record<LegalDocId, LegalDocument>> = { ru, en }

export function getLegalDoc(lang: Lang, id: LegalDocId) {
  return docs[lang][id]
}

export const LEGAL_DOC_IDS: LegalDocId[] = ['user-agreement', 'privacy', 'kyc-aml']
