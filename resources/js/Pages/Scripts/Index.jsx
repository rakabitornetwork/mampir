import { Head, router } from '@inertiajs/react';
import { Download, ScrollText } from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button, CodeBlock, Panel, inputClass } from '@/Components/UI';

export default function ScriptsIndex({ customers, selectedId, scripts, customer }) {
    const [id, setId] = useState(selectedId || '');

    return (
        <AdminLayout
            title="Script Generator"
            subtitle="Generate otomatis script server CHR dan client router pelanggan."
        >
            <Head title="Script Generator" />

            <Panel>
                <div className="flex flex-wrap items-end gap-3">
                    <label className="block min-w-[240px] flex-1 space-y-1.5">
                        <span className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft/70">
                            Pilih pelanggan
                        </span>
                        <select
                            className={inputClass()}
                            value={id}
                            onChange={(e) => {
                                setId(e.target.value);
                                router.get('/scripts', { customer_id: e.target.value || undefined }, { preserveState: true });
                            }}
                        >
                            <option value="">— pilih —</option>
                            {customers.map((c) => (
                                <option key={c.id} value={c.id} disabled={!c.has_tunnel}>
                                    {c.name} ({c.username}) · {c.status}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </Panel>

            {scripts && customer ? (
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <Panel
                        title={`Server · ${customer.username}`}
                        action={
                            <a href={`/scripts/${customer.id}/server`}>
                                <Button variant="soft">
                                    <Download className="h-4 w-4" />
                                    .rsc
                                </Button>
                            </a>
                        }
                    >
                        <CodeBlock code={scripts.server} />
                    </Panel>
                    <Panel
                        title={`Client · ${customer.username}`}
                        action={
                            <a href={`/scripts/${customer.id}/client`}>
                                <Button variant="soft">
                                    <Download className="h-4 w-4" />
                                    .rsc
                                </Button>
                            </a>
                        }
                    >
                        <CodeBlock code={scripts.client} />
                    </Panel>
                    <Panel
                        className="lg:col-span-2"
                        title="Disable script (saat expired)"
                        action={
                            <a href={`/scripts/${customer.id}/disable`}>
                                <Button variant="soft">
                                    <Download className="h-4 w-4" />
                                    .rsc
                                </Button>
                            </a>
                        }
                    >
                        <CodeBlock code={scripts.disable} />
                    </Panel>
                </div>
            ) : (
                <div className="mt-10 flex flex-col items-center gap-3 text-ink-soft/70">
                    <ScrollText className="h-10 w-10 opacity-40" />
                    <p>Pilih pelanggan untuk melihat script yang digenerate.</p>
                </div>
            )}
        </AdminLayout>
    );
}
