import { linesNeedingClarification } from '@/entities/quote/lib/clarification';
import type { Mail } from '@/entities/quote/model/types';
import { useClarificationDraft } from '@/features/clarification-draft';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { useCommunicationStore } from '@/pages/quote-detail/model/communicationStore';
import { pluralSuffix } from '@/shared/lib/format';
import { AttachmentList } from '@/shared/ui/Attachment';
import { AccordionItem, DirectionBadge, MailBody } from '@/shared/ui/Accordion';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Field';
import { Tag } from '@/shared/ui/Tag';
import { useToast } from '@/shared/ui/Toast';

const mailTitle = (mail: Mail, quotationNumber: string, fileType: string): string => {
  switch (mail.kind) {
    case 'inbound':
      return `RFQ received · ${fileType}${fileType === 'MTML' ? ' (eConnect → 7S GENERAL → SCINT)' : ' (Data Team → SCINT)'}`;
    case 'clarification':
      return `Clarification · ${mail.lineIds.length} line${pluralSuffix(mail.lineIds.length)}`;
    case 'quotation':
      return `Quotation ${quotationNumber}${mail.revision ? ` · ${mail.revision}` : ''}`;
    default:
      return mail.title ?? 'Reply';
  }
};

const direction = (mail: Mail): 'in' | 'out' | 'draft' => {
  if (mail.status === 'draft') return 'draft';
  return mail.kind === 'inbound' || mail.kind === 'customerReply' ? 'in' : 'out';
};

/** Тред листування з клієнтом: вхідні RFQ, уточнення, котирування, відповіді. */
export const CustomerThread = () => {
  const { quote, actions } = useQuoteDetail();
  const toast = useToast();
  const draft = useClarificationDraft();

  const openMailId = useCommunicationStore((state) => state.openMailId);
  const setOpenMail = useCommunicationStore((state) => state.setOpenMail);

  // За замовчуванням розгорнутий останній лист.
  const lastMailId = quote.mails.at(-1)?.id ?? null;
  const activeMailId = openMailId ?? lastMailId;

  const hasPendingClarification =
    quote.mails.some((mail) => mail.kind === 'clarification' && mail.status === 'sent') &&
    !quote.mails.some((mail) => mail.isAnswerToClarification);

  return (
    <>
      {quote.mails.map((mail) => (
        <AccordionItem
          key={mail.id}
          open={activeMailId === mail.id}
          onToggle={() => setOpenMail(activeMailId === mail.id ? null : mail.id)}
          badge={<DirectionBadge kind={direction(mail)} />}
          title={mailTitle(mail, quote.header.quotationNumber, quote.header.fileType)}
          meta={mail.at}
        >
          {mail.status === 'draft' ? (
            <>
              <Textarea
                className="min-h-[160px] w-full"
                defaultValue={mail.body}
                aria-label="Clarification draft"
                onBlur={(event) =>
                  void actions.saveClarificationDraft({
                    mailId: mail.id,
                    lineIds: mail.lineIds,
                    body: event.target.value,
                  })
                }
              />
              <div className="mt-2 flex items-center gap-1.5">
                <Button
                  variant="primary"
                  onClick={async () => {
                    await actions.sendMail(mail.id);
                    toast.show('Clarification sent · waiting for customer');
                  }}
                >
                  Send
                </Button>
                <Button onClick={() => void actions.discardMail(mail.id)}>Discard</Button>
                <span className="ml-auto text-[13px] text-ink4">
                  To: {quote.header.contactEmail} · cc supply.singapore@
                </span>
              </div>
            </>
          ) : (
            <>
              <MailBody>{mail.body}</MailBody>
              <AttachmentList names={mail.attachments} />

              {mail.proposedUpdates.length > 0 && (
                <div className="mt-2 rounded-lg border border-[#BFD0F5] bg-[#F5F8FF] px-3 py-2.5 text-[13px]">
                  <b>Proposed updates from this reply</b> — matched to lines; nothing changes until
                  you apply.
                  <table className="mt-1.5 w-full text-[13px]">
                    <thead>
                      <tr className="text-left text-ink3">
                        <th className="px-2 py-1.5 font-medium">Line</th>
                        <th className="px-2 py-1.5 font-medium">Was</th>
                        <th className="px-2 py-1.5 font-medium">Now</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {mail.proposedUpdates.map((update) => {
                        const line = quote.lines.find((item) => item.id === update.lineId);
                        return (
                          <tr key={update.lineId}>
                            <td className="px-2 py-1.5">{line?.customerDescription}</td>
                            <td className="px-2 py-1.5 text-ink4">{update.before}</td>
                            <td className="px-2 py-1.5">{update.after}</td>
                            <td className="px-2 py-1.5">
                              {update.isApplied ? (
                                <Tag tone="ok">Applied</Tag>
                              ) : (
                                <span className="flex gap-1.5">
                                  <Button
                                    size="xs"
                                    variant="primary"
                                    onClick={async () => {
                                      await actions.applyProposedUpdate(mail.id, update.lineId, true);
                                      toast.show("Line updated from the customer's answer");
                                    }}
                                  >
                                    Apply
                                  </Button>
                                  <Button
                                    size="xs"
                                    onClick={() =>
                                      void actions.applyProposedUpdate(mail.id, update.lineId, false)
                                    }
                                  >
                                    Skip
                                  </Button>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </AccordionItem>
      ))}

      {hasPendingClarification && (
        <div className="border-b border-line2 px-4 py-3 text-[13.5px] text-ink4">
          Waiting for the customer&apos;s answer to the clarification.{' '}
          <Button
            size="xs"
            onClick={async () => {
              await actions.simulateCustomerClarificationAnswer();
              toast.show('Customer answered · updates proposed, not applied');
            }}
          >
            ⟳ Receive answer (demo)
          </Button>
        </div>
      )}

      {quote.sentAt && !quote.hasCustomerReply && (
        <div className="border-b border-line2 px-4 py-3 text-[13.5px] text-ink4">
          Waiting for the customer&apos;s decision on the quote.{' '}
          <Button
            size="xs"
            onClick={async () => {
              await actions.simulateCustomerQuoteReply();
              toast.show('Customer replied');
            }}
          >
            ⟳ Receive reply (demo)
          </Button>
        </div>
      )}

      <div className="px-4 py-3">
        <Button
          size="xs"
          badge={linesNeedingClarification(quote).length || undefined}
          onClick={() => void draft.openDraft()}
        >
          + Email to customer
        </Button>
      </div>
    </>
  );
};
