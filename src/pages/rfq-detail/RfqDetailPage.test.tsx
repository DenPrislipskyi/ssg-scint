import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { RfqDetailPage } from '@/pages/rfq-detail/RfqDetailPage';
import { renderWithProviders } from '@/test/renderWithProviders';

/** Поля фільтрів дебаунсяться, тож чекати доводиться довше за рендер. */
const SLOW = { timeout: 3000 };

/** Підказка на закритому другому етапі — те, що бачать при наведенні. */
const SHUT = 'Confirm a product for every line before sourcing suppliers';

/**
 * Довести до товару всі три позиції.
 *
 * Дві закриває пропозиція пошуку; третій аркуш не запропонував нічого, тож
 * товар для неї шукають руками — це єдиний шлях, який має така позиція, і
 * без нього другий етап не відкрити.
 */
const settleEveryLine = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Accept all proposed' }));
  await screen.findByText('2 of 3 line(s) matched');

  const orphan = (await screen.findByText(/turbocharger cartridge/)).closest('tr')!;
  await user.click(orphan);
  await user.click(screen.getByRole('button', { name: 'Or pick manually' }));
  await user.click(await screen.findByText('WELDER GLOVES FIVE FINGERS', undefined, SLOW));
  await user.click(within(orphan).getByRole('button', { name: 'Confirm' }));
  await screen.findByText('3 of 3 line(s) matched');
};

const render = () =>
  renderWithProviders(<RfqDetailPage />, {
    path: '/rfqs/:rfqId',
    initialEntries: ['/rfqs/sample'],
  });

describe('RfqDetailPage', () => {
  beforeEach(() => localStorage.clear());

  it('titles the page with the RFQ reference, not the vessel', async () => {
    render();

    // Номер десk, а не id запису й не судно: у заголовку стоїть те, чим цей
    // RFQ називають люди.
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('RFQ-0042');
    expect(heading).not.toHaveTextContent('ALMI');
    expect(heading).not.toHaveTextContent('sample');
  });

  it('puts the RFQ reference in the header fields', async () => {
    render();
    await screen.findByRole('heading', { level: 1 });

    const field = screen.getByText('RFQ reference').closest('div')!;
    expect(field).toHaveTextContent('RFQ-0042');
  });

  it('puts the RFQ into the header breadcrumb', async () => {
    render();

    // Крихту виставляє ефект сторінки, тож чекаємо на неї, а не читаємо одразу.
    const crumb = await screen.findByText(/^›/);
    expect(screen.getByRole('banner')).toContainElement(crumb);
  });

  it('goes back to the list from the header button', async () => {
    const user = userEvent.setup();
    render();

    const back = await screen.findByRole('button', { name: '← RFQ list' });
    await user.click(back);

    expect(window.location.pathname).not.toBe('/rfqs/sample');
  });

  it('shows the five RFQ header fields', async () => {
    render();
    await screen.findByRole('heading', { level: 1 });

    for (const label of [
      'RFQ reference',
      'Customer',
      'Vessel',
      'Customer RFQ reference',
      'RFQ lines',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('purchasing@almi.example.com')).toBeInTheDocument();
    expect(screen.getByText('MV ALMI GLOBE · IMO 9417751')).toBeInTheDocument();
  });

  it('marks only the first POC stage as current', async () => {
    render();
    await screen.findByRole('heading', { level: 1 });

    const stages = screen.getAllByRole('listitem');
    expect(stages).toHaveLength(4);
    expect(stages[0]).toHaveAttribute('aria-current', 'step');
    expect(stages[1]).not.toHaveAttribute('aria-current');
    // Третій і четвертий етапи ще не написані й кажуть про себе саме це.
    expect(stages[2]).toHaveTextContent('Not in this POC');
    expect(stages[3]).toHaveTextContent('Not in this POC');
  });

  it('splits the matching table into customer and internal column groups', async () => {
    render();
    await screen.findByRole('heading', { level: 1 });

    const customerGroup = screen.getByRole('columnheader', { name: 'CUSTOMER RFQ DATA' });
    expect(customerGroup).toHaveAttribute('colspan', '5');
    expect(screen.getByRole('columnheader', { name: 'MATCHED INTERNAL PRODUCT' })).toHaveAttribute(
      'colspan',
      '8',
    );
  });

  it('renders the confidence as a percentage with a bar', async () => {
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69133100')).closest('tr')!;
    expect(within(row).getByText('70 %')).toBeInTheDocument();
  });

  it('scores a line its code confirmed, like any other', async () => {
    // Колонка не має зяяти на третині рядків: суддя порівнював ті самі два
    // речення, які рахує формула.
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69128400')).closest('tr')!;
    expect(within(row).getByText('71 %')).toBeInTheDocument();
  });

  it('gives every RFQ line one row, however many candidates it has', async () => {
    // Позиція 2 має двох кандидатів. Розкладені в таблицю, вони читалися б як
    // дві позиції замовлення, яких клієнт не просив.
    render();
    await screen.findByRole('heading', { level: 1 });

    const body = (await screen.findByText('T69128400')).closest('tbody')!;
    const lines = within(body).getAllByRole('row');
    expect(lines).toHaveLength(3);
    expect(lines.map((row) => within(row).getAllByRole('cell')[0]?.textContent)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('proposes the best candidate in the row and hides the rest', async () => {
    render();
    await screen.findByRole('heading', { level: 1 });

    expect(await screen.findByText('T69133100')).toBeInTheDocument();
    expect(screen.queryByText('T69114500')).not.toBeInTheDocument();
  });

  it('opens the candidates under the line it was asked about', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    await user.click((await screen.findByText('T69133100')).closest('tr')!);

    expect(screen.getByText('Candidates from item DB')).toBeInTheDocument();
    expect(screen.getByText('HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM')).toBeInTheDocument();
    expect(screen.getByText('best match')).toBeInTheDocument();
    expect(screen.getByText('alternative')).toBeInTheDocument();
  });

  it('closes the open line when it is clicked again', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69133100')).closest('tr')!;
    await user.click(row);
    await user.click(row);

    expect(screen.queryByText('Candidates from item DB')).not.toBeInTheDocument();
  });

  it('keeps only one line open at a time', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    await user.click((await screen.findByText('T69133100')).closest('tr')!);
    await user.click((await screen.findByText('T69128400')).closest('tr')!);

    expect(screen.getAllByText('Candidates from item DB')).toHaveLength(1);
    expect(screen.getByText('confirmed by code')).toBeInTheDocument();
  });

  it('moves the chosen candidate into the row and the compare table', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69133100')).closest('tr')!;
    await user.click(row);
    await user.click(screen.getByText('HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM'));

    // Права половина рядка тепер про обраний товар.
    expect(within(row).getByText('T69114500')).toBeInTheDocument();
    expect(within(row).getByText('50 %')).toBeInTheDocument();
    expect(within(row).getByText('JIT')).toBeInTheDocument();

    // І табличка порівняння теж - інакше вона показувала б інший товар, ніж
    // рядок над нею.
    const compare = screen.getByText('Item code').closest('table')!;
    expect(within(compare).getByText('T69114500')).toBeInTheDocument();
  });

  it('leaves the customer half alone when a candidate is chosen', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69133100')).closest('tr')!;
    await user.click(row);
    await user.click(screen.getByText('HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM'));

    expect(
      within(row).getByText('bolts hex head with nuts, M20 x 80, full thread'),
    ).toBeInTheDocument();
    expect(within(row).getByText('12')).toBeInTheDocument();
  });

  it('marks the chosen candidate as the one that is showing', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    await user.click((await screen.findByText('T69133100')).closest('tr')!);
    const second = screen.getByText('HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM').closest('button')!;
    await user.click(second);

    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByText('HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM').closest('button'),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps a choice made before the line was closed', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69133100')).closest('tr')!;
    await user.click(row);
    await user.click(screen.getByText('HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM'));
    await user.click(row);

    expect(screen.queryByText('Candidates from item DB')).not.toBeInTheDocument();
    expect(within(row).getByText('T69114500')).toBeInTheDocument();
  });

  it('starts every line as Review Needed', async () => {
    render();
    await screen.findByRole('heading', { level: 1 });

    expect(screen.getAllByText('Review Needed')).toHaveLength(3);
    expect(screen.queryByText('Matched')).not.toBeInTheDocument();
    expect(screen.getByText('0 of 3 line(s) matched')).toBeInTheDocument();
  });

  it('settles a line on the chosen product when Confirm is pressed', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69133100')).closest('tr')!;
    await user.click(row);
    await user.click(screen.getByText('HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM'));
    await user.click(within(row).getByRole('button', { name: 'Confirm' }));

    expect(await within(row).findByText('Matched')).toBeInTheDocument();
    const button = within(row).getByRole('button', { name: 'Confirmed ✓' });
    expect(button).toBeDisabled();
    expect(await screen.findByText('1 of 3 line(s) matched')).toBeInTheDocument();
  });

  it('un-settles a line when a different product is chosen', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69133100')).closest('tr')!;
    await user.click(row);
    await user.click(within(row).getByRole('button', { name: 'Confirm' }));
    await within(row).findByText('Matched');

    await user.click(screen.getByText('HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM'));

    expect(await within(row).findByText('Review Needed')).toBeInTheDocument();
    expect(await screen.findByText('0 of 3 line(s) matched')).toBeInTheDocument();
  });

  it('cannot confirm a line the sheet had nothing for', async () => {
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText(/turbocharger cartridge/)).closest('tr')!;

    expect(within(row).getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('offers the whole sheet when none of the candidates is right', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    await user.click((await screen.findByText('T69133100')).closest('tr')!);
    await user.click(screen.getByRole('button', { name: 'Or pick manually' }));

    expect(screen.getByLabelText('Filter by item code')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by item description')).toBeInTheDocument();
    // Товар, якого в кандидатах цієї позиції немає.
    expect(
      await screen.findByText('WELDER GLOVES FIVE FINGERS', undefined, SLOW),
    ).toBeInTheDocument();
  });

  it('narrows the sheet by item code', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    await user.click((await screen.findByText('T69133100')).closest('tr')!);
    await user.click(screen.getByRole('button', { name: 'Or pick manually' }));
    await user.type(screen.getByLabelText('Filter by item code'), 'T851');

    // Список лишається на місці, поки летить наступний запит, тож чекаємо, аж
    // поки справдиться і те, і те - інакше зловили б проміжний порожній кадр.
    // Довший бюджет, бо чекаємо на дебаунс поля, а не на рендер.
    await waitFor(() => {
      expect(screen.getByText('WELDER GLOVES FIVE FINGERS')).toBeInTheDocument();
      expect(screen.queryByText('RULE CONVEX STEEL METRIC 5MTR')).not.toBeInTheDocument();
    }, SLOW);
  });

  it('narrows the sheet by item description', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    await user.click((await screen.findByText('T69133100')).closest('tr')!);
    await user.click(screen.getByRole('button', { name: 'Or pick manually' }));
    await user.type(screen.getByLabelText('Filter by item description'), 'liferaft');

    await waitFor(() => {
      expect(
        screen.getByText('SAFETY SIGN DAVIT-LAUNCHED LIFERAFT 150 X 150 MM'),
      ).toBeInTheDocument();
      expect(screen.queryByText('WELDER GLOVES FIVE FINGERS')).not.toBeInTheDocument();
    }, SLOW);
  });

  it('moves a product picked by hand into the row and the compare table', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69133100')).closest('tr')!;
    await user.click(row);
    await user.click(screen.getByRole('button', { name: 'Or pick manually' }));
    await user.click(await screen.findByText('WELDER GLOVES FIVE FINGERS', undefined, SLOW));

    expect(within(row).getByText('T85116300')).toBeInTheDocument();
    const compare = screen.getByText('Item code').closest('table')!;
    expect(within(compare).getByText('T85116300')).toBeInTheDocument();
  });

  it('gives a product picked by hand no percentage', async () => {
    // Людина обрала його сама; покриття слів не було причиною.
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69133100')).closest('tr')!;
    await user.click(row);
    await user.click(screen.getByRole('button', { name: 'Or pick manually' }));
    await user.click(await screen.findByText('WELDER GLOVES FIVE FINGERS', undefined, SLOW));

    expect(within(row).queryByText(/%/)).not.toBeInTheDocument();
  });

  it('settles a line on a product that was never on its shortlist', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69133100')).closest('tr')!;
    await user.click(row);
    await user.click(screen.getByRole('button', { name: 'Or pick manually' }));
    await user.click(await screen.findByText('WELDER GLOVES FIVE FINGERS', undefined, SLOW));
    await user.click(within(row).getByRole('button', { name: 'Confirm' }));

    expect(await within(row).findByText('Matched')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Confirmed ✓' })).toBeDisabled();
  });

  it('settles every line that has something to settle, at once', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('button', { name: 'Accept all proposed' }));

    // Дві з трьох: третій позиції аркуш не має чого запропонувати.
    expect(await screen.findByText('2 of 3 line(s) matched')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Confirmed ✓' })).toHaveLength(2);
  });

  it('accepts the operator own pick, not the proposal it replaced', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69133100')).closest('tr')!;
    await user.click(row);
    await user.click(screen.getByText('HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM'));
    await user.click(screen.getByRole('button', { name: 'Accept all proposed' }));

    await screen.findByText('2 of 3 line(s) matched');
    expect(within(row).getByText('T69114500')).toBeInTheDocument();
  });

  it('has nothing left to accept once everything is settled', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const accept = screen.getByRole('button', { name: 'Accept all proposed' });
    await user.click(accept);
    await screen.findByText('2 of 3 line(s) matched');

    expect(accept).toBeDisabled();
  });

  it('names no supplier until the line is settled on a product', async () => {
    // Постачальник — наслідок підтвердження. Ім'я поруч із непідтвердженою
    // пропозицією читалося б як рішення, якого ніхто не ухвалював.
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69133100')).closest('tr')!;
    await user.click(row);
    await user.click(screen.getByText('HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM'));

    expect(within(row).queryByText('Seaboard Industrial Supplies FZE')).not.toBeInTheDocument();
  });

  it('names the chosen product supplier once the line is confirmed', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69133100')).closest('tr')!;
    await user.click(row);
    await user.click(screen.getByText('HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM'));
    await user.click(within(row).getByRole('button', { name: 'Confirm' }));

    await within(row).findByText('Matched');
    // Постачальник обраного товару, а не того, що пропонував пошук.
    const cells = within(row).getAllByRole('cell');
    expect(cells[9]).toHaveTextContent('Seaboard Industrial Supplies FZE');
  });

  it('drops the supplier when a different product is chosen', async () => {
    // Товар і постачальник їдуть разом: рядок не має права показати новий
    // товар зі старим постачальником поруч.
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69133100')).closest('tr')!;
    await user.click(row);
    await user.click(within(row).getByRole('button', { name: 'Confirm' }));
    await within(row).findByText('Matched');
    expect(within(row).getAllByRole('cell')[9]).toHaveTextContent(
      'Northgate Marine Fasteners Ltd.',
    );

    await user.click(screen.getByText('HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM'));

    await within(row).findByText('Review Needed');
    expect(within(row).getAllByRole('cell')[9]).not.toHaveTextContent('Northgate');
    expect(within(row).getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

  it('names the supplier of a product picked by hand, once confirmed', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69133100')).closest('tr')!;
    await user.click(row);
    await user.click(screen.getByRole('button', { name: 'Or pick manually' }));
    await user.click(await screen.findByText('WELDER GLOVES FIVE FINGERS', undefined, SLOW));
    await user.click(within(row).getByRole('button', { name: 'Confirm' }));

    await within(row).findByText('Matched');
    expect(within(row).getAllByRole('cell')[9]).toHaveTextContent('Harbour Safety Equipment Co.');
  });

  it('offers the whole sheet even to a line its code already settled', async () => {
    // Один кандидат - це не «вибору немає»: постачальника цієї позиції все
    // одно можна змінити, і шлях до цього той самий.
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69128400')).closest('tr')!;
    await user.click(row);

    expect(screen.getByRole('button', { name: 'Or pick manually' })).toBeInTheDocument();
  });

  it('says which supplier each candidate would settle the line on', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    await user.click((await screen.findByText('T69133100')).closest('tr')!);

    const alternative = screen
      .getByText('HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM')
      .closest('button')!;
    expect(alternative).toHaveTextContent('Supplier · Seaboard Industrial Supplies FZE');
  });

  it('names no supplier for a product that is already on our shelf', async () => {
    // Позиція 1 — складська. Аркуш несе для неї фірму, але беремо зі свого
    // складу, тож у колонці постачальника нікого.
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69128400')).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Confirm' }));

    await within(row).findByText('Matched');
    expect(within(row).getAllByRole('cell')[9]).not.toHaveTextContent('Northgate');
  });

  it('keeps Supplier Sourcing shut while a line is still unconfirmed', async () => {
    render();
    await screen.findByRole('heading', { level: 1 });

    const sourcing = screen.getAllByRole('listitem')[1]!;
    expect(sourcing).toHaveTextContent('3 lines still to confirm');
    expect(within(sourcing).queryByRole('link')).not.toBeInTheDocument();
    expect(within(sourcing).getByTitle(SHUT)).toBeInTheDocument();
  });

  it('counts down the lines left to confirm', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('button', { name: 'Accept all proposed' }));
    await screen.findByText('2 of 3 line(s) matched');

    expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('1 line still to confirm');
  });

  it('opens Supplier Sourcing once every line is settled', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });
    await settleEveryLine(user);

    const sourcing = screen.getAllByRole('listitem')[1]!;
    // Дві з трьох позицій JIT: складська на другий етап не їде.
    expect(sourcing).toHaveTextContent('2 JIT lines to source');
    expect(within(sourcing).getByRole('link')).toHaveAttribute('href', '/rfqs/sample/sourcing');
  });

  it('says so when the sheet had nothing for a line', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText(/turbocharger cartridge/)).closest('tr')!;
    await user.click(row);

    expect(screen.getByText('The sheet had nothing to offer for this line.')).toBeInTheDocument();
  });
});
