import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RFQ_STAGE } from '@/app/router/paths';
import { RfqDetailPage } from '@/pages/rfq-detail/RfqDetailPage';
import { renderWithProviders } from '@/test/renderWithProviders';

/** Поля фільтрів дебаунсяться, тож чекати доводиться довше за рендер. */
const SLOW = { timeout: 3000 };

const SAMPLE = 'Load sample supplier response';
const INQUIRE = 'Send Web Inquiry';
/** Місце колонки з ціною серед восьми колонок таблиці пропозицій. */
const PRICE = 5;

/**
 * Send the web inquiries as a person does: open the letters, send them. A
 * supplier can only answer once they have gone out.
 */
const sendInquiries = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: INQUIRE }));
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: INQUIRE }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
};

/** Рядки нижньої таблиці — тієї, що про відповіді постачальників. */
const offerRows = () =>
  within(
    screen.getByText('Product / specification').closest('table')!.querySelector('tbody')!,
  ).getAllByRole('row');

const cellsOf = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent);

const MATCHING = { path: '/rfqs/:rfqId', element: <RfqDetailPage /> };
const SOURCING = {
  path: '/rfqs/:rfqId/sourcing',
  element: <RfqDetailPage stage={RFQ_STAGE.sourcing} />,
};
const PRICING = {
  path: '/rfqs/:rfqId/pricing',
  element: <RfqDetailPage stage={RFQ_STAGE.pricing} />,
};
const FINAL = {
  path: '/rfqs/:rfqId/finalisation',
  element: <RfqDetailPage stage={RFQ_STAGE.finalisation} />,
};

/** Другий етап, відкритий за власною адресою — так, як на нього переходять. */
const renderSourcing = () =>
  renderWithProviders(SOURCING.element, {
    path: SOURCING.path,
    initialEntries: ['/rfqs/sample/sourcing'],
    siblings: [MATCHING, PRICING, FINAL],
  });

/**
 * Той самий екран, але через перший етап: mock-репозиторій тримає
 * підтвердження в собі, тож довести позиції до товару можна тільки руками.
 */
const settleEverything = async () => {
  const user = userEvent.setup();
  renderWithProviders(MATCHING.element, {
    path: MATCHING.path,
    initialEntries: ['/rfqs/sample'],
    siblings: [SOURCING, PRICING, FINAL],
  });
  await screen.findByRole('heading', { level: 1 });

  await user.click(screen.getByRole('button', { name: 'Accept all proposed' }));
  await screen.findByText('2 of 3 line(s) matched');

  const orphan = (await screen.findByText(/turbocharger cartridge/)).closest('tr')!;
  await user.click(orphan);
  await user.click(screen.getByRole('button', { name: 'Or pick manually' }));
  await user.click(await screen.findByText('WELDER GLOVES FIVE FINGERS', undefined, SLOW));
  await user.click(within(orphan).getByRole('button', { name: 'Confirm' }));
  await screen.findByText('3 of 3 line(s) matched');

  return user;
};

describe('Supplier Sourcing', () => {
  it('sends an unsettled RFQ back to Product Matching', async () => {
    // Підказка в шапці — це прохання не заходити; адресний рядок його обходить,
    // тож етап мусить бути закритий і тут.
    renderSourcing();

    expect(await screen.findByText('Product matching')).toBeInTheDocument();
    expect(screen.queryByText('Supplier sourcing · JIT products')).not.toBeInTheDocument();
  });

  it('lists the JIT lines with the supplier each was settled on', async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));

    await screen.findByText('Supplier sourcing · JIT products');
    const body = screen.getByText('Internal item code').closest('table')!.querySelector('tbody')!;
    const rows = within(body).getAllByRole('row');

    // Позиція 1 складська — на цьому екрані її немає, і це не пропажа:
    // товар уже наш, питати про нього нема кого.
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('T69133100');
    expect(rows[0]).toHaveTextContent('Northgate Marine Fasteners Ltd.');
    expect(rows[1]).toHaveTextContent('T85116300');
    expect(rows[1]).toHaveTextContent('Harbour Safety Equipment Co.');
    expect(within(body).queryByText('T69128400')).not.toBeInTheDocument();
  });

  it('keeps the line numbers the customer RFQ gave them', async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));

    await screen.findByText('Supplier sourcing · JIT products');
    const body = screen.getByText('Internal item code').closest('table')!.querySelector('tbody')!;
    const rows = within(body).getAllByRole('row');

    // 2 і 3, а не 1 і 2: позицію шукатимуть на першому етапі за її номером.
    expect(within(rows[0]!).getAllByRole('cell')[0]).toHaveTextContent('2');
    expect(within(rows[1]!).getAllByRole('cell')[0]).toHaveTextContent('3');
  });

  it('counts the JIT lines and says the stock ones skip this stage', async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));

    expect(
      await screen.findByText(/2 JIT lines · In-Stock lines skip sourcing/),
    ).toBeInTheDocument();
  });

  it('asks about the same lines the inquiry went out for', async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));

    await screen.findByText('Supplier offers');
    expect(screen.getByText('2 JIT lines without a confirmed cost')).toBeInTheDocument();

    const rows = offerRows();
    expect(rows).toHaveLength(2);
    // Постачальник, товар, одиниця й кількість — те саме, про що питали вище.
    expect(cellsOf(rows[0]!)).toEqual([
      '2',
      'Northgate Marine Fasteners Ltd.',
      'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM',
      'pcs',
      '12',
      '—',
      '',
    ]);
    expect(cellsOf(rows[1]!).slice(0, 5)).toEqual([
      '3',
      'Harbour Safety Equipment Co.',
      'WELDER GLOVES FIVE FINGERS',
      'pc',
      '1',
    ]);
  });

  it('quotes no price until a supplier has answered', async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier offers');

    expect(offerRows().map((row) => cellsOf(row)[PRICE])).toEqual(['—', '—']);
  });

  it('puts a price on every line when the sample response is loaded', async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier offers');

    await sendInquiries(user);
    await user.click(screen.getByRole('button', { name: SAMPLE }));

    // Вигадані числа, тож перевіряємо форму: долар і одна цифра після коми.
    // Чекаємо, бо ціна їде в запис і повертається звідти, а не з пам'яті.
    await waitFor(() => {
      for (const row of offerRows()) {
        expect(cellsOf(row)[PRICE]).toMatch(/^\$\d{1,3}\.\d$/);
      }
    });
  });

  it('keeps the prices after the page is opened again', async () => {
    // Відповідь постачальника — те, на що потім виставляють рахунок. Вона
    // живе в записі, а не у вкладці, яку хтось закрив.
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier offers');
    await sendInquiries(user);
    await user.click(screen.getByRole('button', { name: SAMPLE }));
    await waitFor(() => expect(cellsOf(offerRows()[0]!)[PRICE]).not.toBe('—'));
    const quoted = offerRows().map((row) => cellsOf(row)[PRICE]);

    // Туди й назад: сторінка монтується заново і читає запис із нуля.
    await user.click(within(screen.getAllByRole('listitem')[0]!).getByRole('link'));
    await screen.findByText('Product matching');
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier offers');

    expect(offerRows().map((row) => cellsOf(row)[PRICE])).toEqual(quoted);
  });

  it('goes from nothing, to Sent, to Received as the suppliers are written to and answer', async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier offers');
    const load = () => screen.getByRole('button', { name: SAMPLE });
    const statuses = () =>
      within(screen.getByText('Inquiry status').closest('table')!.querySelector('tbody')!)
        .getAllByRole('row')
        .map((row) => within(row).getAllByRole('cell').at(-1)!.textContent);

    // Nobody written to yet: no status, and nobody to hear back from.
    expect(statuses()).toEqual(['', '']);
    expect(load()).toBeDisabled();
    expect(within(load().parentElement!).getByRole('tooltip')).toHaveTextContent(
      'Send the web inquiries to the suppliers first',
    );

    await sendInquiries(user);
    await waitFor(() => expect(statuses()).toEqual(['Sent', 'Sent']));
    expect(load()).toBeEnabled();

    await user.click(load());
    await waitFor(() => expect(statuses()).toEqual(['Received', 'Received']));
  });

  it('keeps the loaded prices put when the button is pressed again', async () => {
    // Друге натискання перемішало б числа, які хтось уже прочитав.
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier offers');

    await sendInquiries(user);
    const load = () => screen.getByRole('button', { name: SAMPLE });
    await user.click(load());
    await waitFor(() => expect(cellsOf(offerRows()[0]!)[PRICE]).not.toBe('—'));
    const quoted = offerRows().map((row) => cellsOf(row)[PRICE]);

    // Питаємо про кнопку заново: вимкнена вона живе в обгортці, яка несе
    // підказку, і посилання, зняте до цього, вказує вже не на неї.
    expect(load()).toBeDisabled();
    await user.click(load());
    expect(offerRows().map((row) => cellsOf(row)[PRICE])).toEqual(quoted);
  });

  it('gets back to Product Matching from the stage above it', async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier sourcing · JIT products');

    expect(within(screen.getAllByRole('listitem')[0]!).getByRole('link')).toHaveAttribute(
      'href',
      '/rfqs/sample',
    );
  });
});

describe('What the suppliers answered, back on Product Matching', () => {
  /** Клітинка «Suggested supplier» того рядка, де стоїть цей товар. */
  const supplierCellOf = (description: string) =>
    within(screen.getByText(description).closest('tr')!).getAllByRole('cell')[9]!;

  /** Довести все до товару, завантажити ціни і повернутись на перший етап. */
  const loadAndGoBack = async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier offers');

    await sendInquiries(user);
    await user.click(screen.getByRole('button', { name: SAMPLE }));
    await waitFor(() => expect(cellsOf(offerRows()[0]!)[PRICE]).not.toBe('—'));

    // Назад тим самим посиланням, що й людина. Нічого не перезавантажуємо:
    // якби підпис вимагав перезавантаження, тут його не було б.
    await user.click(within(screen.getAllByRole('listitem')[0]!).getByRole('link'));
    await screen.findByText('AI confidence');
  };

  it('says nothing under a supplier until somebody answers', async () => {
    await settleEverything();
    await screen.findByText('AI confidence');

    expect(screen.queryByText(/Unit Price:/)).not.toBeInTheDocument();
    expect(screen.queryByText('stock — no inquiry')).not.toBeInTheDocument();
  });

  it('quotes the price and the quantity under a JIT supplier', async () => {
    await loadAndGoBack();

    const cell = supplierCellOf('WELDER GLOVES FIVE FINGERS');
    expect(cell).toHaveTextContent(/Unit Price: \d+\.\d{2} USD/);
    expect(cell).toHaveTextContent(/Available Qty: /);
  });

  it('says why a stock line has no price', async () => {
    await loadAndGoBack();

    expect(supplierCellOf('HEX HEAD BOLT/NUT STEEL UNGALV, M16 X 65MM')).toHaveTextContent(
      'stock — no inquiry',
    );
  });
});

describe('Sorting Product Matching by what the agent was sure of', () => {
  /** Оцінки, як вони зараз стоять на екрані, згори вниз. */
  const marksOnScreen = () =>
    screen
      .getAllByRole('row')
      .map((row) => within(row).queryAllByRole('cell')[10]?.textContent?.trim())
      .filter((mark): mark is string => mark !== undefined && mark !== '');

  const openMatching = async () => {
    const user = userEvent.setup();
    renderWithProviders(MATCHING.element, {
      path: MATCHING.path,
      initialEntries: ['/rfqs/sample'],
      siblings: [SOURCING, PRICING, FINAL],
    });
    await screen.findByText('AI confidence');
    return user;
  };

  it('opens with the surest match on top', async () => {
    await openMatching();

    const marks = marksOnScreen();
    expect(marks.length).toBeGreaterThan(1);
    expect(marks).toEqual([...marks].sort((a, b) => parseInt(b, 10) - parseInt(a, 10)));
  });

  it('turns around when the other arrow is pressed', async () => {
    const user = await openMatching();
    const down = screen.getByRole('button', { name: /lowest first/ });

    await user.click(down);

    const marks = marksOnScreen();
    expect(marks).toEqual([...marks].sort((a, b) => parseInt(a, 10) - parseInt(b, 10)));
  });

  it('says which way it is sorted, rather than leaving it to be guessed', async () => {
    const user = await openMatching();
    const header = screen.getByText('AI confidence').closest('th')!;

    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('button', { name: /highest first/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: /lowest first/ }));

    expect(header).toHaveAttribute('aria-sort', 'ascending');
  });
});

describe('Pricing', () => {
  /** Підпис третього етапу в шапці — те, що видно, не відкриваючи екрана. */
  const pricingStage = () => screen.getAllByRole('listitem')[2]!;

  const openPricing = async () => {
    const user = await settleEverything();
    await user.click(within(pricingStage()).getByRole('link'));
    await screen.findByText('Total quote amount');
    return user;
  };

  it('says in the stage header what it is counting with', async () => {
    await openPricing();

    expect(pricingStage()).toHaveTextContent('In-Stock 12 % · JIT 15 %');
  });

  it('keeps that header and the field showing one number, not two', async () => {
    // Те саме число стоїть у двох місцях; дві копії розійшлися б першого ж
    // натискання, і людина не знала б, за якою з них порахована сума.
    const user = await openPricing();

    await user.clear(screen.getByLabelText('In-Stock margin %'));
    await user.type(screen.getByLabelText('In-Stock margin %'), '20');

    expect(pricingStage()).toHaveTextContent('In-Stock 20 % · JIT 15 %');
  });

  /**
   * Той самий екран, але з цінами: доводимо позиції до товару, завантажуємо
   * відповіді постачальників і повертаємось на третій етап.
   */
  const openPricedPricing = async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier offers');
    await sendInquiries(user);
    await user.click(screen.getByRole('button', { name: SAMPLE }));
    await waitFor(() => expect(cellsOf(offerRows()[0]!)[PRICE]).not.toBe('—'));
    await user.click(within(screen.getAllByRole('listitem')[2]!).getByRole('link'));
    await screen.findByText('Total quote amount');
    return user;
  };

  const onwards = () => screen.getByRole('button', { name: /Continue to RFQ Finalisation/ });
  const finalStage = () => screen.getAllByRole('listitem')[3]!;

  it('sends you for the missing prices while any are missing', async () => {
    await openPricing();

    expect(onwards()).toBeDisabled();
    expect(within(onwards().parentElement!).getByRole('tooltip')).toHaveTextContent(
      /Make sure every line has a price/,
    );
  });

  it('asks for the signature once the prices are all in', async () => {
    // Дві різні відповіді на два різні стани: спершу бракує чисел, потім —
    // підпису під ними.
    await openPricedPricing();

    expect(onwards()).toBeDisabled();
    expect(within(onwards().parentElement!).getByRole('tooltip')).toHaveTextContent(
      /Approve the pricing first/,
    );
  });

  it('says on the fourth stage that the prices are what is missing', async () => {
    await openPricing();

    expect(finalStage()).toHaveTextContent('Awaiting supplier prices');
    expect(within(finalStage()).queryByRole('link')).not.toBeInTheDocument();
  });

  it('says on the fourth stage that the signature is what is missing', async () => {
    await openPricedPricing();

    expect(finalStage()).toHaveTextContent('Awaiting approval');
    expect(within(finalStage()).queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('RFQ Finalisation', () => {
  const finalStage = () => screen.getAllByRole('listitem')[3]!;

  /**
   * Весь шлях, як ним іде людина: підтвердити товари, завантажити відповіді,
   * підписати ціни й перейти на четвертий етап.
   */
  const approveAndOpen = async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier offers');

    await sendInquiries(user);
    await user.click(screen.getByRole('button', { name: SAMPLE }));
    await waitFor(() => expect(cellsOf(offerRows()[0]!)[PRICE]).not.toBe('—'));

    await user.click(within(screen.getAllByRole('listitem')[2]!).getByRole('link'));
    await screen.findByText('Total quote amount');
    await user.click(screen.getByRole('button', { name: /Approve/ }));
    await screen.findByRole('button', { name: /Approved/ });

    await user.click(within(finalStage()).getByRole('link'));
    await screen.findByText('Confirmed RFQ data · internal review');
    return user;
  };

  it('opens only once the pricing has been approved', async () => {
    await approveAndOpen();

    expect(screen.getByText('Values below are the confirmed values from stages 1–3')).toBeVisible();
  });

  it('repeats the approved total rather than counting again', async () => {
    await approveAndOpen();
    const shown = screen.getByText('Total quote amount').closest('tr')!.textContent;

    expect(shown).toMatch(/\$[\d,]+\.\d{2}/);
  });

  it('shows every line of the RFQ', async () => {
    await approveAndOpen();

    const body = screen.getByText('Customer item code').closest('table')!.querySelector('tbody')!;
    expect(within(body).getAllByRole('row')).toHaveLength(3);
  });

  it('keeps showing the margins the quotation was signed with', async () => {
    // Після підпису аркуш більше не має права переписати ці числа: він
    // пояснював би затверджену ціну націнкою, яка її не давала.
    const user = await approveAndOpen();
    await user.click(within(screen.getAllByRole('listitem')[2]!).getByRole('link'));
    await screen.findByText('Total quote amount');

    expect(screen.getByLabelText('In-Stock margin %')).toHaveValue(12);
    expect(screen.getAllByRole('listitem')[2]).toHaveTextContent('In-Stock 12 % · JIT 15 %');
  });

  it('does not carry the Pack size column the prototype had', async () => {
    await approveAndOpen();

    expect(screen.queryByText('Pack size')).not.toBeInTheDocument();
  });

  describe('Generate quotation', () => {
    const sg = () => screen.getByRole('button', { name: 'SG standard' });
    const uae = () => screen.getByRole('button', { name: 'UAE standard' });
    const customer = () => screen.getByRole('button', { name: 'Customer file (.xlsx)' });
    const pdf = () => screen.getByRole('button', { name: 'Download PDF' });
    const excel = () => screen.getByRole('button', { name: 'Download Excel' });
    const tooltipOf = (button: HTMLElement) => within(button.parentElement!).getByRole('tooltip');

    /** Record what the page hands the browser to save, instead of saving it. */
    const capturingSaves = () => {
      const saved: string[] = [];
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        saved.push(this.download);
      });
      // jsdom has no object URLs; these stand in for the browser's and are put
      // back afterwards, so no other test inherits them.
      const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
      URL.createObjectURL = vi.fn(() => 'blob:quotation');
      URL.revokeObjectURL = vi.fn();
      const restore = () => {
        click.mockRestore();
        URL.createObjectURL = original.create;
        URL.revokeObjectURL = original.revoke;
      };
      return { saved, restore };
    };

    it('shows no document until a format is picked', async () => {
      // Until then it is not known whose letterhead the document goes out on.
      await approveAndOpen();

      expect(sg()).toHaveAttribute('aria-pressed', 'false');
      expect(screen.queryByText(/^Quotation · /)).not.toBeInTheDocument();
    });

    it('previews the SG form once it is picked', async () => {
      const user = await approveAndOpen();

      await user.click(sg());

      // Drawn as the PDF prints it: the office's letterhead, the banner and
      // the grey panels, not the table the fourth stage shows.
      expect(sg()).toHaveAttribute('aria-pressed', 'true');
      expect(await screen.findByRole('heading', { name: /^Quotation For / })).toBeVisible();
      expect(screen.getByText('Seven Seas Maritime Services (Singapore) Pte. Ltd')).toBeVisible();
      expect(screen.getByText('Customer Address')).toBeVisible();
      expect(screen.getByText('Supplier Terms and Condition')).toBeVisible();
    });

    it('quotes every line, at the same total as the table above', async () => {
      // Two counts of one quotation on one screen are two quotations.
      const user = await approveAndOpen();
      await user.click(sg());

      const items = (await screen.findByText('Identification')).closest('table')!;
      const reviewed = screen.getByText('Total quote amount').closest('tr')!.lastChild!.textContent;
      const quoted = screen.getByText('Total Price(USD)').closest('tr')!.lastChild!.textContent;

      expect(within(items.querySelector('tbody')!).getAllByRole('row')).toHaveLength(3);
      // The PDF writes `5632.84`, the page `$5,632.84`: one number either way.
      expect(Number(quoted)).toBe(Number(reviewed!.replace(/[$,]/g, '')));
    });

    it('does not carry the Pack column the prototype had', async () => {
      const user = await approveAndOpen();
      await user.click(sg());

      const items = (await screen.findByText('Identification')).closest('table')!;
      expect(within(items).queryByText(/^Pack/)).not.toBeInTheDocument();
    });

    it('asks for a format before it offers the PDF', async () => {
      await approveAndOpen();

      expect(pdf()).toBeDisabled();
      expect(tooltipOf(pdf())).toHaveTextContent('Pick a quotation format first');
      expect(excel()).toBeDisabled();
      expect(tooltipOf(excel())).toHaveTextContent('Pick a quotation format first');
    });

    it('saves the PDF under the RFQ number', async () => {
      const { saved, restore } = capturingSaves();
      try {
        const user = await approveAndOpen();
        await user.click(sg());
        await user.click(pdf());

        await waitFor(() => expect(saved).toEqual(['RFQ-0042_quotation.pdf']));
      } finally {
        restore();
      }
    });

    it('offers the SG form as both files', async () => {
      const user = await approveAndOpen();
      await user.click(sg());

      expect(pdf()).toBeEnabled();
      expect(excel()).toBeEnabled();
    });

    it('saves the SG workbook under its own name', async () => {
      const { saved, restore } = capturingSaves();
      try {
        const user = await approveAndOpen();
        await user.click(sg());
        await user.click(excel());

        await waitFor(() => expect(saved).toEqual(['RFQ-0042_quotation_sg.xlsm']));
      } finally {
        restore();
      }
    });

    it('previews the UAE form from the Dubai office', async () => {
      const user = await approveAndOpen();

      await user.click(uae());

      expect(uae()).toHaveAttribute('aria-pressed', 'true');
      expect(sg()).toHaveAttribute('aria-pressed', 'false');
      expect(await screen.findByText('Seven Seas Shipchandlers (L.L.C)')).toBeVisible();
    });

    it('offers the UAE form as both files', async () => {
      const user = await approveAndOpen();
      await user.click(uae());

      expect(pdf()).toBeEnabled();
      expect(excel()).toBeEnabled();
    });

    it('saves the UAE workbook under its own name', async () => {
      const { saved, restore } = capturingSaves();
      try {
        const user = await approveAndOpen();
        await user.click(uae());
        await user.click(excel());

        await waitFor(() => expect(saved).toEqual(['RFQ-0042_quotation_uae.xlsm']));
      } finally {
        restore();
      }
    });

    it('saves the UAE PDF under the RFQ number', async () => {
      const { saved, restore } = capturingSaves();
      try {
        const user = await approveAndOpen();
        await user.click(uae());
        await user.click(pdf());

        await waitFor(() => expect(saved).toEqual(['RFQ-0042_quotation.pdf']));
      } finally {
        restore();
      }
    });

    it("previews the customer's file in their own words", async () => {
      const user = await approveAndOpen();

      await user.click(customer());

      expect(
        screen.getByRole('heading', { name: 'Quotation · Customer file (.xlsx)' }),
      ).toBeVisible();
      expect(screen.getByText("Populated into the customer's own file structure")).toBeVisible();
      // The same description the fourth-stage table shows as the customer's.
      const reviewed = screen.getByText('Customer description').closest('table')!;
      const theirs = within(reviewed.querySelector('tbody')!)
        .getAllByRole('row')
        .map((row) => within(row).getAllByRole('cell')[2]!.textContent);
      const document = screen.getByText('Total (USD)').closest('table')!;
      const shown = within(document.querySelector('tbody')!)
        .getAllByRole('row')
        .map((row) => within(row).getAllByRole('cell')[2]!.textContent);
      expect(shown).toEqual(theirs);
      // Not a match of two columns of dashes.
      expect(shown.some((text) => text !== '—')).toBe(true);
    });

    it("offers the customer's file as Excel and not as PDF", async () => {
      const user = await approveAndOpen();
      await user.click(customer());

      expect(excel()).toBeEnabled();
      expect(pdf()).toBeDisabled();
      expect(tooltipOf(pdf())).toHaveTextContent('Customer file (.xlsx) is Excel only');
    });

    it("saves the customer's file under the RFQ number", async () => {
      const { saved, restore } = capturingSaves();
      try {
        const user = await approveAndOpen();
        await user.click(customer());
        await user.click(excel());

        await waitFor(() => expect(saved).toEqual(['RFQ-0042_customer_file.xlsx']));
      } finally {
        restore();
      }
    });
  });
});
