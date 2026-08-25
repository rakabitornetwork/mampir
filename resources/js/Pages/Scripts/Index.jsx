import { Head, Link, router } from '@inertiajs/react';
import { Cable, Download, ScrollText, Terminal } from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button, CodeBlock, EmptyState, Panel, inputClass } from '@/Components/UI';

export default function ScriptsIndex({ customers, selectedId, scripts, customer }) {
    const [id, setId] = useState(selectedId || '');

    return (
        <AdminLayout
            title="Script Generator"
            subtitle="Pilih pelanggan, salin script, lalu tempel: server di CHR, client di router pelanggan."
            crumbs={[{ label: 'Script Generator' }]}
        >
            <Head title="Script Generator" />

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
                {[
                    { n: '1', title: 'Pilih pelanggan', text: 'Yang sudah punya tunnel & port block.' },
                    { n: '2', title: 'Script client', text: 'Tempel di router pelanggan (L2TP + route).' },
                    { n: '3', title: 'Script server', text: 'Opsional jika belum di-push otomatis ke CHR.' },
                ].map((item) => (
                    <div key={item.n} className="surface rounded-2xl px-4 py-3">
                        <div className="font-mono text-[10px] text-gold">{item.n}</div>
                        <div className="mt-1 text-sm font-semibold text-ink">{item.title}</div>
                        <p className="mt-0.5 text-xs text-ink-soft/70">{item.text}</p>
                    </div>
                ))}
            </div>

            <Panel title="Pelanggan" description="Hanya akun dengan tunnel yang bisa digenerate.">
                <div className="flex flex-wrap items-end gap-3">
                    <label className="block min-w-[240px] flex-1 space-y-1.5">
                        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft/70">
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
                    {customer && (
                        <Link href={`/customers/${customer.id}`}>
                            <Button variant="soft">Buka detail</Button>
                        </Link>
                    )}
                </div>
            </Panel>

            {scripts && customer ? (
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <Panel
                        title={`Server · ${customer.username}`}
                        description="Tempel di terminal CHR jika konfigurasi belum di-push dari panel."
                        action={
                            <a href={`/scripts/${customer.id}/server`}>
                                <Button variant="soft">
                                    <Download className="h-4 w-4" />
                                    .rsc
                                </Button>
                            </a>
                        }
                    >
                        <div className="mb-3 flex items-center gap-2 text-xs text-ink-soft/70">
                            <Cable className="h-3.5 w-3.5 text-teal" />
                            PPP secret + NAT di Cloud Hosted Router
                        </div>
                        <CodeBlock code={scripts.server} label="Server · CHR" />
                    </Panel>
                    <Panel
                        title={`Client · ${customer.username}`}
                        description="Ini yang dikirim ke pelanggan — tempel di router mereka."
                        action={
                            <a href={`/scripts/${customer.id}/client`}>
                                <Button variant="soft">
                                    <Download className="h-4 w-4" />
                                    .rsc
                                </Button>
                            </a>
                        }
                    >
                        <div className="mb-3 flex items-center gap-2 text-xs text-ink-soft/70">
                            <Terminal className="h-3.5 w-3.5 text-sky" />
                            L2TP client di sisi pelanggan
                        </div>
                        <CodeBlock code={scripts.client} label="Client · pelanggan" />
                    </Panel>
                    <Panel
                        className="lg:col-span-2"
                        title="Disable script (saat expired)"
                        description="Cadangan manual. Scheduler chr:expire biasanya sudah menonaktifkan secret otomatis."
                        action={
                            <a href={`/scripts/${customer.id}/disable`}>
                                <Button variant="soft">
                                    <Download className="h-4 w-4" />
                                    .rsc
                                </Button>
                            </a>
                        }
                    >
                        <CodeBlock code={scripts.disable} label="Disable · expired" />
                    </Panel>
                </div>
            ) : (
                <div className="surface mt-6 rounded-2xl">
                    <EmptyState
                        icon={ScrollText}
                        title="Pilih pelanggan untuk melihat script"
                        description={
                            customers.length === 0
                                ? 'Belum ada pelanggan. Buat akun dulu, atau tarik dari CHR.'
                                : 'Script server, client, dan disable akan muncul setelah pelanggan dipilih.'
                        }
                        action={
                            customers.length === 0 ? (
                                <Link href="/customers/create">
                                    <Button variant="teal">Buat pelanggan</Button>
                                </Link>
                            ) : null
                        }
                    />
                </div>
            )}
        </AdminLayout>
    );
}
